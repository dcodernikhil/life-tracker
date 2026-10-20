
import api from "./api";

export const timeEntriesService = {
  async getAll() {
    const { data } = await api.get("/time-entries/");
    return data.items;
  },

  async create(payload) {
    const { data } = await api.post("/time-entries/", payload);
    return data;
  },

  async update(id, payload) {
    const { data } = await api.put(`/time-entries/${id}`, payload);
    return data;
  },

  async remove(id) {
    const { data } = await api.delete(`/time-entries/${id}`);
    return data;
  },
};
