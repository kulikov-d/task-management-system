import { create } from "zustand";

interface FiltersState {
  projectId: string | null;
  sprintId: string | null;
  status: string | null;
  priority: string | null;
  assigneeId: string | null;
  dateFrom: string | null;
  dateTo: string | null;
  search: string;

  setProjectId: (id: string | null) => void;
  setSprintId: (id: string | null) => void;
  setStatus: (status: string | null) => void;
  setPriority: (priority: string | null) => void;
  setAssigneeId: (id: string | null) => void;
  setDateFrom: (date: string | null) => void;
  setDateTo: (date: string | null) => void;
  setSearch: (search: string) => void;
  resetFilters: () => void;
}

const initialState = {
  projectId: null,
  sprintId: null,
  status: null,
  priority: null,
  assigneeId: null,
  dateFrom: null,
  dateTo: null,
  search: "",
};

export const useFiltersStore = create<FiltersState>((set) => ({
  ...initialState,

  setProjectId: (projectId) => set({ projectId }),
  setSprintId: (sprintId) => set({ sprintId }),
  setStatus: (status) => set({ status }),
  setPriority: (priority) => set({ priority }),
  setAssigneeId: (assigneeId) => set({ assigneeId }),
  setDateFrom: (dateFrom) => set({ dateFrom }),
  setDateTo: (dateTo) => set({ dateTo }),
  setSearch: (search) => set({ search }),
  resetFilters: () => set(initialState),
}));
