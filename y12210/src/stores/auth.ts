import { defineStore } from 'pinia';
import { ref, computed } from 'vue';

export interface User {
  id: string;
  name: string;
  role: 'admin' | 'operator';
  avatar?: string;
}

export const useAuthStore = defineStore('auth', () => {
  const currentUser = ref<User>({
    id: 'user-001',
    name: '财务管理员',
    role: 'admin',
  });

  const isAdmin = computed(() => currentUser.value.role === 'admin');
  const userName = computed(() => currentUser.value.name);

  function setUser(user: User) {
    currentUser.value = user;
  }

  function logout() {
    currentUser.value = { id: '', name: '', role: 'operator' };
  }

  return {
    currentUser,
    isAdmin,
    userName,
    setUser,
    logout,
  };
});
