import AsyncStorage from '@react-native-async-storage/async-storage';
import { nanoid } from 'nanoid/non-secure';
import React, { createContext, useContext, useEffect, useMemo, useReducer } from 'react';

/** 🔗 Supabase sync/push **/
import { pushToSupabase } from '@/lib/sync';
/** 🔗 Supabase client **/
import { supabase } from '@/lib/supabaseClient';
/** 👤 sessão (para namespacing do cache local por usuário) **/
import { useSession } from '@/state/session';

export type LoyaltyProgram = {
  id: string;
  name: string;
  totalStamps: number;
  reward: string;
  pin: string;
  cover?: string;
};

export type Customer = {
  id: string;
  name: string;
  phone: string;
  stamps: number;
  programId: string;
};

export type Redemption = {
  id: string;
  customerId: string;
  programId: string;
  createdAt: string; // ISO
};

export type PlanId = 'freemium' | 'start' | 'pro';

export type Profile = {
  ownerName: string;
  storeName: string;
  phone: string;
  email: string;
  businessType: string;
};

type Limits = {
  maxPrograms: number;
  maxCustomersPerProgram: number;
};

export type State = {
  programs: LoyaltyProgram[];
  customers: Customer[];
  redemptions: Redemption[];
  plan: PlanId;
  limits: Limits;
  profile: Profile;
};

/** ✅ Mapa canônico de limites por plano */
const PLAN_LIMITS: Record<PlanId, { programs: number; customers: number }> = {
  freemium: { programs: 1, customers: 10 },
  start:    { programs: 5, customers: 30 },
  pro:      { programs: 10, customers: 60 },
};

function deriveLimits(plan: PlanId): Limits {
  const base = PLAN_LIMITS[plan] ?? PLAN_LIMITS.freemium;
  return { maxPrograms: base.programs, maxCustomersPerProgram: base.customers };
}

/** 🧮 Selectors auxiliares */
export function getLimitsBase(plan: PlanId): Limits { return deriveLimits(plan); }
export function selectLimits(state: State): Limits { return state.limits; }
export function shouldShowAds(plan: PlanId): boolean { return plan === 'freemium'; }
export function selectPlan(state: State): PlanId { return state.plan; }

/** 📞 Helpers de telefone (inalterados) */
function stripDigits(v: string) { return (v || '').replace(/\D+/g, ''); }
export function normalizePhone(raw: string) {
  let d = stripDigits(raw);
  if (d.startsWith('0055')) d = d.slice(4);
  else if (d.startsWith('055')) d = d.slice(3);
  else if (d.startsWith('55')) d = d.slice(2);
  if (d.length >= 2 && d[0] === '0') d = d.slice(1);
  if (d.length > 11) d = d.slice(-11);
  return d;
}
export function isValidBRPhone(raw: string) {
  const d = normalizePhone(raw);
  if (d.length !== 10 && d.length !== 11) return false;
  const ddd = d.slice(0, 2);
  if (ddd[0] === '0') return false;
  if (d.length === 11 && d[2] !== '9') return false;
  return true;
}
export function formatBRPhone(raw: string) {
  const d = normalizePhone(raw);
  if (d.length <= 2) return `(${d}`;
  const ddd = d.slice(0, 2);
  if (d.length <= 6) return `(${ddd}) ${d.slice(2)}`;
  if (d.length === 10) return `(${ddd}) ${d.slice(2, 6)}-${d.slice(6)}`;
  return `(${ddd}) ${d.slice(2, 7)}-${d.slice(7)}`;
}

const initialState: State = {
  programs: [],
  customers: [],
  redemptions: [],
  plan: 'freemium',
  limits: deriveLimits('freemium'),
  profile: { ownerName: '', storeName: '', phone: '', email: '', businessType: '' },
};

type Action =
  | { type: 'HYDRATE'; payload: Partial<State> }
  | { type: 'ADD_PROGRAM'; payload: LoyaltyProgram }
  | { type: 'UPDATE_PROGRAM'; id: string; patch: Partial<LoyaltyProgram> }
  | { type: 'REMOVE_PROGRAM'; id: string }
  | { type: 'ADD_CUSTOMER'; payload: Customer }
  | { type: 'REMOVE_CUSTOMER'; id: string }
  | { type: 'ADD_STAMP'; id: string }
  | { type: 'RESET_CUSTOMER'; id: string }
  | { type: 'APPEND_REDEMPTION'; payload: Redemption }
  | { type: 'SET_PLAN'; plan: PlanId }
  | { type: 'SET_PLAN_AND_LIMITS'; plan: PlanId; limits: Limits }
  | { type: 'UPDATE_PROFILE'; payload: Partial<Profile> }
  | { type: 'RESET_STORE' };

function reducer(state: State, action: Action): State {
  switch (action.type) {
    case 'HYDRATE': return { ...state, ...action.payload };

    case 'ADD_PROGRAM':
      return { ...state, programs: [...state.programs, action.payload] };

    case 'UPDATE_PROGRAM':
      return {
        ...state,
        programs: state.programs.map(p => p.id === action.id ? { ...p, ...action.patch } : p),
      };

    case 'REMOVE_PROGRAM':
      return {
        ...state,
        programs: state.programs.filter(p => p.id !== action.id),
        customers: state.customers.filter(c => c.programId !== action.id),
        redemptions: state.redemptions.filter(r => r.programId !== action.id),
      };

    case 'ADD_CUSTOMER':
      return { ...state, customers: [...state.customers, action.payload] };

    case 'REMOVE_CUSTOMER':
      return { ...state, customers: state.customers.filter(c => c.id !== action.id) };

    case 'ADD_STAMP':
      return {
        ...state,
        customers: state.customers.map(c => (c.id === action.id ? { ...c, stamps: c.stamps + 1 } : c)),
      };

    case 'RESET_CUSTOMER': {
      const target = state.customers.find(c => c.id === action.id);
      if (!target) return state;
      const redemption: Redemption = {
        id: nanoid(), customerId: target.id, programId: target.programId, createdAt: new Date().toISOString(),
      };
      return {
        ...state,
        customers: state.customers.map(c => (c.id === action.id ? { ...c, stamps: 0 } : c)),
        redemptions: [redemption, ...state.redemptions],
      };
    }

    case 'APPEND_REDEMPTION':
      if (state.redemptions.some(r => r.id === action.payload.id)) return state;
      return { ...state, redemptions: [action.payload, ...state.redemptions] };

    case 'SET_PLAN': return { ...state, plan: action.plan };

    case 'SET_PLAN_AND_LIMITS': return { ...state, plan: action.plan, limits: action.limits };

    case 'UPDATE_PROFILE': return { ...state, profile: { ...state.profile, ...action.payload } };

    case 'RESET_STORE': return initialState;

    default: return state;
  }
}

const StoreContext = createContext<{
  state: State;
  addProgram: (p: Omit<LoyaltyProgram, 'id'>) => void;
  updateProgram: (id: string, patch: Partial<LoyaltyProgram>) => void;
  removeProgram: (id: string) => void;
  addCustomer: (c: Omit<Customer, 'id' | 'stamps'>) => void;
  removeCustomer: (id: string) => void;
  addStamp: (id: string) => void;
  resetCustomer: (id: string) => void;
  appendRedemption: (r: Redemption) => void;
  setPlan: (plan: PlanId) => void;
  setPlanAndLimits: (plan: PlanId, limits?: Partial<Limits>) => void;
  forceReloadUser: () => Promise<void>;
  updateProfile: (patch: Partial<Profile>) => Promise<void>; // ⬅️ agora async
  resetStore: () => void;
}>({} as any);

export function StoreProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(reducer, initialState);
  const { session } = useSession();
  const userId = session?.user?.id ?? null;

  const storageKey = userId ? `@fidelapp_state_${userId}` : '@fidelapp_state_anon';

  // Load por usuário (namespaced) + reset ao trocar usuário
  useEffect(() => {
    (async () => {
      try {
        dispatch({ type: 'RESET_STORE' });
        const json = await AsyncStorage.getItem(storageKey);
        if (json) {
          const parsed = JSON.parse(json) as Partial<State>;
          if (!parsed.limits && parsed.plan) parsed.limits = deriveLimits(parsed.plan);
          dispatch({ type: 'HYDRATE', payload: parsed });
        }
      } catch (e) { console.warn('load error', e); }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [storageKey]);

  // Persist por usuário
  useEffect(() => {
    AsyncStorage.setItem(storageKey, JSON.stringify(state)).catch(() => {});
  }, [state, storageKey]);

  // Pull inicial de redemptions (já filtrado por RLS)
  useEffect(() => {
    (async () => {
      try {
        const { data, error } = await supabase
          .from('redemptions')
          .select('id, program_id, customer_id, created_at')
          .order('created_at', { ascending: false })
          .limit(200);
        if (error || !data) return;
        const mapped: Redemption[] = data.map(r => ({
          id: r.id as string,
          programId: r.program_id as string,
          customerId: r.customer_id as string,
          createdAt: r.created_at as string,
        }));
        dispatch({ type: 'HYDRATE', payload: { redemptions: mapped } });
      } catch (e) { console.log('pull redemptions error', e); }
    })();
  }, []);

  /** 🔄 Puxa usuário (plano/limites) */
  const forceReloadUser = async () => {
    try {
      if (!userId) return;
      const { data, error } = await supabase
        .from('users')
        .select('plan, max_programs, max_customers_per_program')
        .eq('id', userId)
        .single();
      if (error || !data) return;

      const plan = (data.plan ?? 'freemium') as PlanId;
      const base = deriveLimits(plan);
      const limits: Limits = {
        maxPrograms:
          typeof data.max_programs === 'number' && data.max_programs > 0 ? data.max_programs : base.maxPrograms,
        maxCustomersPerProgram:
          typeof data.max_customers_per_program === 'number' && data.max_customers_per_program > 0
            ? data.max_customers_per_program
            : base.maxCustomersPerProgram,
      };
      dispatch({ type: 'SET_PLAN_AND_LIMITS', plan, limits });
    } catch (e) { console.log('forceReloadUser error', e); }
  };

  /** 1) ⬇️ Helper para puxar o perfil quando logar */
  const pullProfile = async () => {
    try {
      if (!userId) return;
      const { data, error } = await supabase
        .from('profiles') // ← nome da tabela que você criou
        .select('owner_name, store_name, phone, email, business_type')
        .eq('id', userId)
        .single();

      if (error || !data) return;

      dispatch({
        type: 'UPDATE_PROFILE',
        payload: {
          ownerName:    data.owner_name ?? '',
          storeName:    data.store_name ?? '',
          phone:        data.phone ?? '',
          email:        data.email ?? '',
          businessType: data.business_type ?? '',
        },
      });
    } catch (e) { console.log('pullProfile error', e); }
  };

  // 2) ⬇️ Chamar pullProfile junto com forceReloadUser ao trocar de usuário
  useEffect(() => {
    forceReloadUser();
    pullProfile();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId]);

  const value = useMemo(() => {
    const addProgram = (p: Omit<LoyaltyProgram, 'id'>) => {
      const limit = state.limits.maxPrograms;
      if (state.programs.length >= limit) { alert(`Limite de ${limit} cartões atingido no seu plano.`); return; }
      const newProgram: LoyaltyProgram = { id: nanoid(), ...p };
      dispatch({ type: 'ADD_PROGRAM', payload: newProgram });

      (async () => {
        try {
          await pushToSupabase({
            programs: [{
              id: newProgram.id, name: newProgram.name, total_stamps: newProgram.totalStamps, reward: newProgram.reward, pin: newProgram.pin,
            }],
          });
        } catch (e) { console.log('push addProgram error', e); }
      })();
    };

    const addCustomer = (c: Omit<Customer, 'id' | 'stamps'>) => {
      const programCustomers = state.customers.filter(x => x.programId === c.programId);
      const limit = state.limits.maxCustomersPerProgram;
      if (programCustomers.length >= limit) { alert(`Limite de ${limit} clientes por cartão atingido.`); return; }
      if (!isValidBRPhone(c.phone)) { alert('Telefone inválido. Use DDD + número (ex.: (61) 98110-1086).'); return; }

      const normalizedNew = normalizePhone(c.phone);
      const duplicate = programCustomers.some(x => normalizePhone(x.phone) === normalizedNew);
      if (duplicate) { alert('Este telefone já está cadastrado neste cartão.'); return; }

      const newCustomer: Customer = { id: nanoid(), stamps: 0, ...c };
      dispatch({ type: 'ADD_CUSTOMER', payload: newCustomer });

      (async () => {
        try {
          await pushToSupabase({
            customers: [{
              id: newCustomer.id, program_id: newCustomer.programId, name: newCustomer.name, phone: newCustomer.phone, stamps: 0,
            }],
          });
        } catch (e) { console.log('push addCustomer error', e); }
      })();
    };

    const updateProgram = (id: string, patch: Partial<LoyaltyProgram>) => {
      dispatch({ type: 'UPDATE_PROGRAM', id, patch });
      const next = { ...(state.programs.find(p => p.id === id) as LoyaltyProgram), ...patch };

      (async () => {
        try {
          await pushToSupabase({
            programs: [{
              id,
              name: next.name,
              total_stamps: next.totalStamps,
              reward: next.reward,
              pin: next.pin,
            }],
          });
        } catch (e) { console.log('push updateProgram error', e); }
      })();
    };

    const removeProgram = (id: string) => {
      dispatch({ type: 'REMOVE_PROGRAM', id });
      (async () => {
        try { await supabase.from('programs').delete().eq('id', id); }
        catch (e) { console.log('delete program error', e); }
      })();
    };

    const removeCustomer = (id: string) => {
      dispatch({ type: 'REMOVE_CUSTOMER', id });
      (async () => {
        try { await supabase.from('customers').delete().eq('id', id); }
        catch (e) { console.log('delete customer error', e); }
      })();
    };

    const addStamp = (id: string) => {
      dispatch({ type: 'ADD_STAMP', id });
      (async () => {
        try {
          const target = state.customers.find(c => c.id === id);
          if (!target) return;
          await pushToSupabase({
            redemptions: [{
              id: nanoid(), program_id: target.programId, customer_id: target.id, type: 'stamp' as const, delta: 1, note: null,
            }],
          });
        } catch (e) { console.log('push stamp error', e); }
      })();
    };

    const resetCustomer = (id: string) => {
      dispatch({ type: 'RESET_CUSTOMER', id });
      (async () => {
        try {
          const customer = state.customers.find(c => c.id === id);
          if (!customer) return;
          const program = state.programs.find(p => p.id === customer.programId);
          const delta = program?.totalStamps ?? null;
          await pushToSupabase({
            redemptions: [{
              id: nanoid(), program_id: customer.programId, customer_id: customer.id, type: 'redeem' as const, delta, note: null,
            }],
          });
        } catch (e) { console.log('push redeem error', e); }
      })();
    };

    const appendRedemption = (r: Redemption) => dispatch({ type: 'APPEND_REDEMPTION', payload: r });

    /** ⚙️ setters */
    const setPlan = (plan: PlanId) => {
      const limits = deriveLimits(plan);
      dispatch({ type: 'SET_PLAN_AND_LIMITS', plan, limits });
    };

    const setPlanAndLimits = (plan: PlanId, overrides?: Partial<Limits>) => {
      const base = deriveLimits(plan);
      const limits: Limits = {
        maxPrograms: overrides?.maxPrograms ?? base.maxPrograms,
        maxCustomersPerProgram: overrides?.maxCustomersPerProgram ?? base.maxCustomersPerProgram,
      };
      dispatch({ type: 'SET_PLAN_AND_LIMITS', plan, limits });
    };

    /** 3) ⬇️ updateProfile com upsert no Supabase */
    const updateProfile = async (patch: Partial<Profile>) => {
      dispatch({ type: 'UPDATE_PROFILE', payload: patch });

      if (!userId) return;

      const current = { ...state.profile, ...patch };
      try {
        await supabase.from('profiles').upsert(
          {
            id: userId,
            owner_name: current.ownerName || null,
            store_name: current.storeName || null,
            phone: current.phone || null,
            email: current.email || null,
            business_type: current.businessType || null,
          },
          { onConflict: 'id' }
        );
      } catch (e) { console.log('upsert profile error', e); }
    };

    return {
      state,
      addProgram,
      updateProgram,
      removeProgram,
      addCustomer,
      removeCustomer,
      addStamp,
      resetCustomer,
      appendRedemption,
      setPlan,
      setPlanAndLimits,
      forceReloadUser,
      updateProfile, // <- agora async
      resetStore: () => dispatch({ type: 'RESET_STORE' }),
    };
  }, [state, forceReloadUser, userId]);

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
}

export const useStore = () => useContext(StoreContext);
