import { firestoreDb } from "./config";
import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
} from "firebase/firestore";
import type { Member, MemberRegistrationInput } from "../types/member";
import crypto from "crypto";

const MEMBERS_COLLECTION = "members";
const MEMBER_OTPS_COLLECTION = "member_otps";

// Almacén en memoria de respaldo para desarrollo local
const fallbackMembers = new Map<string, Member>();
const fallbackOtps = new Map<string, { code: string; expiresAt: number; memberId: string }>();

export const membersService = {
  /**
   * Registra un nuevo miembro en Firebase Firestore
   */
  async createMember(input: MemberRegistrationInput): Promise<Member> {
    const email = input.email.trim().toLowerCase();
    const fullName = input.fullName.trim();
    const phone = input.phone.trim();

    if (!email || !fullName || !phone) {
      throw new Error("Nombre completo, correo y teléfono son obligatorios");
    }

    // Validar formato de email
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      throw new Error("El correo electrónico ingresado no es válido");
    }

    // Verificar si ya existe
    const existing = await this.getMemberByEmail(email);
    if (existing) {
      throw new Error("Ya existe un miembro registrado con este correo electrónico");
    }

    const memberId = crypto.randomUUID();
    const now = new Date().toISOString();

    const newMember: Member = {
      id: memberId,
      fullName,
      email,
      phone,
      isActive: true,
      registeredAt: now,
      lastLoginAt: now,
      source: firestoreDb ? "firebase" : "postgres",
    };

    if (firestoreDb) {
      try {
        const memberDocRef = doc(firestoreDb, MEMBERS_COLLECTION, memberId);
        await setDoc(memberDocRef, {
          id: memberId,
          fullName,
          email,
          phone,
          isActive: true,
          registeredAt: now,
          lastLoginAt: now,
        });
      } catch (err) {
        console.warn("[MembersService] Error al escribir en Firestore, guardando en fallback local:", err);
        fallbackMembers.set(email, newMember);
      }
    } else {
      fallbackMembers.set(email, newMember);
    }

    return newMember;
  },

  /**
   * Obtiene un miembro por su email
   */
  async getMemberByEmail(email: string): Promise<Member | null> {
    const cleanEmail = email.trim().toLowerCase();

    if (firestoreDb) {
      try {
        const membersRef = collection(firestoreDb, MEMBERS_COLLECTION);
        const q = query(membersRef, where("email", "==", cleanEmail));
        const snapshot = await getDocs(q);

        if (!snapshot.empty) {
          const docItem = snapshot.docs[0];
          const data = docItem.data();
          return {
            id: docItem.id,
            fullName: (data.fullName as string) || "",
            email: (data.email as string) || cleanEmail,
            phone: (data.phone as string) || "",
            isActive: data.isActive !== false,
            registeredAt: (data.registeredAt as string) || new Date().toISOString(),
            lastLoginAt: (data.lastLoginAt as string) || null,
            source: "firebase",
          };
        }
      } catch (err) {
        console.warn("[MembersService] Error al leer Firestore por email:", err);
      }
    }

    return fallbackMembers.get(cleanEmail) || null;
  },

  /**
   * Obtiene un miembro por su ID
   */
  async getMemberById(id: string): Promise<Member | null> {
    if (firestoreDb) {
      try {
        const memberDocRef = doc(firestoreDb, MEMBERS_COLLECTION, id);
        const docSnap = await getDoc(memberDocRef);
        if (docSnap.exists()) {
          const data = docSnap.data();
          return {
            id: docSnap.id,
            fullName: (data.fullName as string) || "",
            email: (data.email as string) || "",
            phone: (data.phone as string) || "",
            isActive: data.isActive !== false,
            registeredAt: (data.registeredAt as string) || new Date().toISOString(),
            lastLoginAt: (data.lastLoginAt as string) || null,
            source: "firebase",
          };
        }
      } catch (err) {
        console.warn("[MembersService] Error al leer Firestore por ID:", err);
      }
    }

    for (const member of fallbackMembers.values()) {
      if (member.id === id) return member;
    }
    return null;
  },

  /**
   * Lista todos los miembros registrados
   */
  async getAllMembers(): Promise<Member[]> {
    if (firestoreDb) {
      try {
        const membersRef = collection(firestoreDb, MEMBERS_COLLECTION);
        const q = query(membersRef, orderBy("registeredAt", "desc"));
        const snapshot = await getDocs(q);

        if (!snapshot.empty) {
          return snapshot.docs.map((d) => {
            const data = d.data();
            return {
              id: d.id,
              fullName: (data.fullName as string) || "",
              email: (data.email as string) || "",
              phone: (data.phone as string) || "",
              isActive: data.isActive !== false,
              registeredAt: (data.registeredAt as string) || new Date().toISOString(),
              lastLoginAt: (data.lastLoginAt as string) || null,
              source: "firebase",
            };
          });
        }
      } catch (err) {
        console.warn("[MembersService] Error al listar Firestore:", err);
      }
    }

    return Array.from(fallbackMembers.values()).sort(
      (a, b) => new Date(b.registeredAt).getTime() - new Date(a.registeredAt).getTime(),
    );
  },

  /**
   * Genera un código OTP para inicio de sesión de miembro
   */
  async createMemberOtp(email: string): Promise<{ code: string; member: Member }> {
    const member = await this.getMemberByEmail(email);
    if (!member) {
      throw new Error("No existe ningún miembro registrado con este correo. Por favor registrate primero.");
    }

    if (!member.isActive) {
      throw new Error("Tu cuenta de miembro se encuentra pausada o inactiva. Contactá al staff del Club.");
    }

    const code = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = Date.now() + 15 * 60 * 1000; // 15 min

    if (firestoreDb) {
      try {
        const otpDocRef = doc(firestoreDb, MEMBER_OTPS_COLLECTION, member.id);
        await setDoc(otpDocRef, {
          memberId: member.id,
          email: member.email,
          code,
          expiresAt,
          createdAt: new Date().toISOString(),
        });
      } catch (err) {
        console.warn("[MembersService] Error al guardar OTP en Firestore:", err);
        fallbackOtps.set(member.email, { code, expiresAt, memberId: member.id });
      }
    } else {
      fallbackOtps.set(member.email, { code, expiresAt, memberId: member.id });
    }

    console.log(`\n========================================`);
    console.log(`[AUTH MIEMBROS OTP] Correo: ${member.email}`);
    console.log(`[AUTH MIEMBROS OTP] Código de acceso: ${code}`);
    console.log(`========================================\n`);

    return { code, member };
  },

  /**
   * Verifica un código OTP de miembro
   */
  async verifyMemberOtp(email: string, inputCode: string): Promise<Member> {
    const member = await this.getMemberByEmail(email);
    if (!member) {
      throw new Error("Miembro no encontrado");
    }

    let isValid = false;

    if (firestoreDb) {
      try {
        const otpDocRef = doc(firestoreDb, MEMBER_OTPS_COLLECTION, member.id);
        const docSnap = await getDoc(otpDocRef);
        if (docSnap.exists()) {
          const data = docSnap.data();
          if (data.code === inputCode && data.expiresAt > Date.now()) {
            isValid = true;
            await deleteDoc(otpDocRef);
          }
        }
      } catch (err) {
        console.warn("[MembersService] Error al verificar OTP en Firestore:", err);
      }
    }

    if (!isValid) {
      const fallbackOtp = fallbackOtps.get(member.email);
      if (fallbackOtp && fallbackOtp.code === inputCode && fallbackOtp.expiresAt > Date.now()) {
        isValid = true;
        fallbackOtps.delete(member.email);
      }
    }

    if (!isValid) {
      throw new Error("Código de verificación incorrecto o expirado");
    }

    // Actualizar último login
    const now = new Date().toISOString();
    if (firestoreDb) {
      try {
        const memberDocRef = doc(firestoreDb, MEMBERS_COLLECTION, member.id);
        await updateDoc(memberDocRef, {
          lastLoginAt: now,
        });
      } catch (e) {
        // ignore
      }
    }
    member.lastLoginAt = now;

    return member;
  },
};
