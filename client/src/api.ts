import type {
  Asset,
  Dashboard,
  Household,
  MaritalStatus,
  MarkExecutedInput,
  Person,
  WillDocument,
  WillPlan,
  WillPlanInput,
} from './types'

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(path, {
    headers: { 'Content-Type': 'application/json' },
    ...init,
  })
  if (!response.ok) {
    let detail = `${response.status} ${response.statusText}`
    try {
      const problem = await response.json()
      if (problem?.detail) detail = problem.detail
    } catch {
      // non-JSON error body; keep the status text
    }
    throw new Error(detail)
  }
  if (response.status === 204) return undefined as T
  return response.json() as Promise<T>
}

export interface HouseholdInput {
  name: string
  stateCode: string
  maritalStatus: MaritalStatus
}

export type PersonInput = Omit<Person, 'id'>
export type AssetInput = Omit<Asset, 'id'>

export const api = {
  createHousehold: (input: HouseholdInput) =>
    request<Household>('/api/households', { method: 'POST', body: JSON.stringify(input) }),
  getHousehold: (id: string) => request<Household>(`/api/households/${id}`),
  updateHousehold: (id: string, input: HouseholdInput) =>
    request<Household>(`/api/households/${id}`, { method: 'PUT', body: JSON.stringify(input) }),

  listPeople: (householdId: string) => request<Person[]>(`/api/households/${householdId}/people`),
  createPerson: (householdId: string, input: PersonInput) =>
    request<Person>(`/api/households/${householdId}/people`, { method: 'POST', body: JSON.stringify(input) }),
  updatePerson: (householdId: string, personId: string, input: PersonInput) =>
    request<Person>(`/api/households/${householdId}/people/${personId}`, { method: 'PUT', body: JSON.stringify(input) }),
  deletePerson: (householdId: string, personId: string) =>
    request<void>(`/api/households/${householdId}/people/${personId}`, { method: 'DELETE' }),

  listAssets: (householdId: string) => request<Asset[]>(`/api/households/${householdId}/assets`),
  createAsset: (householdId: string, input: AssetInput) =>
    request<Asset>(`/api/households/${householdId}/assets`, { method: 'POST', body: JSON.stringify(input) }),
  updateAsset: (householdId: string, assetId: string, input: AssetInput) =>
    request<Asset>(`/api/households/${householdId}/assets/${assetId}`, { method: 'PUT', body: JSON.stringify(input) }),
  deleteAsset: (householdId: string, assetId: string) =>
    request<void>(`/api/households/${householdId}/assets/${assetId}`, { method: 'DELETE' }),

  getDashboard: (householdId: string) => request<Dashboard>(`/api/households/${householdId}/dashboard`),

  getWill: (householdId: string) => request<WillPlan>(`/api/households/${householdId}/will`),
  saveWill: (householdId: string, input: WillPlanInput) =>
    request<WillPlan>(`/api/households/${householdId}/will`, { method: 'PUT', body: JSON.stringify(input) }),
  completeWill: (householdId: string) =>
    request<WillPlan>(`/api/households/${householdId}/will/complete`, { method: 'POST' }),
  getWillDocument: (householdId: string) =>
    request<WillDocument>(`/api/households/${householdId}/will/document`),
  markWillExecuted: (householdId: string, input: MarkExecutedInput) =>
    request<WillPlan>(`/api/households/${householdId}/will/execution`, {
      method: 'POST',
      body: JSON.stringify(input),
    }),
}

const HOUSEHOLD_KEY = 'estate-planner.householdId'

export function getCurrentHouseholdId(): string | null {
  return localStorage.getItem(HOUSEHOLD_KEY)
}

export function setCurrentHouseholdId(id: string) {
  localStorage.setItem(HOUSEHOLD_KEY, id)
}

export function formatCurrency(value: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  }).format(value)
}
