
import api from "./api";

export const transactionsService = {
  async getAll() {
    const { data } = await api.get("/transactions/");
    return data.items;
  },

  async create(payload) {
    const { data } = await api.post("/transactions/", payload);
    return data;
  },

  async update(id, payload) {
    const { data } = await api.put(`/transactions/${id}`, payload);
    return data;
  },

  async remove(id) {
    const { data } = await api.delete(`/transactions/${id}`);
    return data;
  },
};
