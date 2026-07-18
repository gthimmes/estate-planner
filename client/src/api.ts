import type {
  Asset,
  Dashboard,
  EstateDocument,
  EstateDocumentInput,
  EstateDocumentType,
  Household,
  MaritalStatus,
  MarkExecutedInput,
  Person,
  TrustPlan,
  TrustPlanInput,
  VaultItem,
  VaultSummary,
  WillDocument,
  WillPlan,
  WillPlanInput,
} from './types'

export class NotFoundError extends Error {}

const personQuery = (personId?: string | null) => (personId ? `?personId=${personId}` : '')

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  let response: Response
  try {
    response = await fetch(path, {
      headers: { 'Content-Type': 'application/json' },
      ...init,
    })
  } catch {
    throw new Error("Can't reach the server. Check that the app's backend is running, then try again.")
  }
  if (response.status === 404) {
    throw new NotFoundError('Not found')
  }
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
  self?: PersonInput
}

export type PersonInput = Omit<Person, 'id'>
export type AssetInput = Omit<Asset, 'id' | 'probateStatus'>

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

  getWill: (householdId: string, personId?: string | null) =>
    request<WillPlan>(`/api/households/${householdId}/will${personQuery(personId)}`),
  saveWill: (householdId: string, input: WillPlanInput) =>
    request<WillPlan>(`/api/households/${householdId}/will`, { method: 'PUT', body: JSON.stringify(input) }),
  completeWill: (householdId: string, personId?: string | null) =>
    request<WillPlan>(`/api/households/${householdId}/will/complete${personQuery(personId)}`, { method: 'POST' }),
  getWillDocument: (householdId: string, personId?: string | null) =>
    request<WillDocument>(`/api/households/${householdId}/will/document${personQuery(personId)}`),
  markWillExecuted: (householdId: string, input: MarkExecutedInput, personId?: string | null) =>
    request<WillPlan>(`/api/households/${householdId}/will/execution${personQuery(personId)}`, {
      method: 'POST',
      body: JSON.stringify(input),
    }),

  getEstateDocument: (householdId: string, type: EstateDocumentType, personId?: string | null) =>
    request<EstateDocument>(`/api/households/${householdId}/documents/${type}${personQuery(personId)}`),
  saveEstateDocument: (householdId: string, type: EstateDocumentType, input: EstateDocumentInput) =>
    request<EstateDocument>(`/api/households/${householdId}/documents/${type}`, {
      method: 'PUT',
      body: JSON.stringify(input),
    }),
  completeEstateDocument: (householdId: string, type: EstateDocumentType, personId?: string | null) =>
    request<EstateDocument>(`/api/households/${householdId}/documents/${type}/complete${personQuery(personId)}`, {
      method: 'POST',
    }),
  markEstateDocumentExecuted: (
    householdId: string,
    type: EstateDocumentType,
    input: { executedOn: string; executionNotes: string | null },
    personId?: string | null,
  ) =>
    request<EstateDocument>(`/api/households/${householdId}/documents/${type}/execution${personQuery(personId)}`, {
      method: 'POST',
      body: JSON.stringify(input),
    }),
  getEstateDocumentRender: (householdId: string, type: EstateDocumentType, personId?: string | null) =>
    request<WillDocument>(`/api/households/${householdId}/documents/${type}/document${personQuery(personId)}`),

  getTrust: (householdId: string, personId?: string | null) =>
    request<TrustPlan>(`/api/households/${householdId}/trust${personQuery(personId)}`),
  saveTrust: (householdId: string, input: TrustPlanInput) =>
    request<TrustPlan>(`/api/households/${householdId}/trust`, { method: 'PUT', body: JSON.stringify(input) }),
  completeTrust: (householdId: string, personId?: string | null) =>
    request<TrustPlan>(`/api/households/${householdId}/trust/complete${personQuery(personId)}`, { method: 'POST' }),
  markTrustExecuted: (
    householdId: string,
    input: { executedOn: string; executionNotes: string | null },
    personId?: string | null,
  ) =>
    request<TrustPlan>(`/api/households/${householdId}/trust/execution${personQuery(personId)}`, {
      method: 'POST',
      body: JSON.stringify(input),
    }),
  getTrustRender: (householdId: string, personId?: string | null) =>
    request<WillDocument>(`/api/households/${householdId}/trust/document${personQuery(personId)}`),

  getVault: (householdId: string) => request<VaultSummary>(`/api/households/${householdId}/vault`),
  createVaultItem: (householdId: string, input: Omit<VaultItem, 'id' | 'updatedAt'>) =>
    request<VaultItem>(`/api/households/${householdId}/vault/items`, {
      method: 'POST',
      body: JSON.stringify(input),
    }),
  deleteVaultItem: (householdId: string, itemId: string) =>
    request<void>(`/api/households/${householdId}/vault/items/${itemId}`, { method: 'DELETE' }),
}

const HOUSEHOLD_KEY = 'estate-planner.householdId'

export function getCurrentHouseholdId(): string | null {
  return localStorage.getItem(HOUSEHOLD_KEY)
}

export function setCurrentHouseholdId(id: string) {
  localStorage.setItem(HOUSEHOLD_KEY, id)
}

export function clearCurrentHouseholdId() {
  localStorage.removeItem(HOUSEHOLD_KEY)
}

export function formatCurrency(value: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  }).format(value)
}
