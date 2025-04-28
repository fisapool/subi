import { describe, it, expect, vi, beforeEach } from 'vitest';
import { mount } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';
import CookieManager from '@/components/CookieManager.vue';
import { useCookieStore } from '@/stores/cookieStore';
import { dialogService } from '@/utils/dialogService';
import { notificationService } from '@/utils/notificationService';
import type { Cookie, CookieStore } from '@/types/cookie';
import { removeCookie } from '@/utils/cookieUtils';

// Mock the store
vi.mock('@/stores/cookieStore', () => ({
  useCookieStore: vi.fn()
}));

// Mock the dialog service
vi.mock('@/utils/dialogService', () => ({
  dialogService: {
    prompt: vi.fn(),
    confirm: vi.fn().mockReturnValue(true)
  }
}));

// Mock the notification service
vi.mock('@/utils/notificationService', () => ({
  notificationService: {
    success: vi.fn(),
    error: vi.fn()
  }
}));

// Mock the cookie utils
vi.mock('@/utils/cookieUtils', () => ({
  removeCookie: vi.fn()
}));

describe('CookieManager Edge Cases', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    vi.clearAllMocks();
  });

  const mockStore: CookieStore = {
    id: '1',
    name: 'Test Store',
    cookies: [
      {
        name: 'test',
        value: 'value',
        domain: 'example.com',
        path: '/',
        secure: true,
        httpOnly: true,
        sameSite: 'strict'
      }
    ],
    createdAt: Date.now(),
    updatedAt: Date.now()
  };

  it('handles duplicate store names gracefully', async () => {
    vi.mocked(dialogService.prompt).mockReturnValue('Test Store');
    const createStore = vi.fn();
    vi.mocked(useCookieStore).mockReturnValue({
      stores: [{ id: '1', name: 'Test Store', cookies: [], createdAt: Date.now(), updatedAt: Date.now() }],
      currentStoreId: null,
      currentStore: null,
      canCreateStore: true,
      createStore,
      deleteStore: vi.fn()
    } as any);

    const wrapper = mount(CookieManager);
    await wrapper.find('.btn-primary').trigger('click');
    expect(dialogService.prompt).toHaveBeenCalledWith('Enter store name:');
    expect(createStore).not.toHaveBeenCalled();
    expect(notificationService.error).toHaveBeenCalledWith('Store name "Test Store" already exists!');
  });

  it('displays an error when the store name is empty', async () => {
    vi.mocked(dialogService.prompt).mockReturnValue('   ');
    const createStore = vi.fn();
    vi.mocked(useCookieStore).mockReturnValue({
      stores: [],
      currentStoreId: null,
      currentStore: null,
      canCreateStore: true,
      createStore,
      deleteStore: vi.fn()
    } as any);

    const wrapper = mount(CookieManager);
    await wrapper.find('.btn-primary').trigger('click');
    expect(dialogService.prompt).toHaveBeenCalledWith('Enter store name:');
    expect(createStore).not.toHaveBeenCalled();
    expect(notificationService.error).toHaveBeenCalledWith('Store name cannot be empty!');
  });

  it('shows notification when store creation fails due to server error', async () => {
    vi.mocked(dialogService.prompt).mockReturnValue('New Store');
    const createStore = vi.fn().mockRejectedValue(new Error('Server Error'));
    vi.mocked(useCookieStore).mockReturnValue({
      stores: [],
      currentStoreId: null,
      currentStore: null,
      canCreateStore: true,
      createStore,
      deleteStore: vi.fn()
    } as any);

    const wrapper = mount(CookieManager);
    await wrapper.find('.btn-primary').trigger('click');
    expect(dialogService.prompt).toHaveBeenCalledWith('Enter store name:');
    expect(createStore).toHaveBeenCalledWith('New Store');
    expect(notificationService.error).toHaveBeenCalledWith('Failed to create store due to server error!');
  });

  it('ensures that store creation is successful and notifies', async () => {
    vi.mocked(dialogService.prompt).mockReturnValue('New Store');
    const createStore = vi.fn().mockResolvedValue({});
    vi.mocked(useCookieStore).mockReturnValue({
      stores: [],
      currentStoreId: null,
      currentStore: null,
      canCreateStore: true,
      createStore,
      deleteStore: vi.fn()
    } as any);

    const wrapper = mount(CookieManager);
    await wrapper.find('.btn-primary').trigger('click');
    expect(dialogService.prompt).toHaveBeenCalledWith('Enter store name:');
    expect(createStore).toHaveBeenCalledWith('New Store');
    expect(notificationService.success).toHaveBeenCalledWith('Store "New Store" created successfully!');
  });

  it('tests the deletion of a store with an invalid ID', async () => {
    const deleteStore = vi.fn().mockRejectedValue(new Error('Invalid Store ID'));
    vi.mocked(useCookieStore).mockReturnValue({
      stores: [mockStore],
      currentStoreId: '1',
      currentStore: mockStore,
      canCreateStore: true,
      createStore: vi.fn(),
      deleteStore
    } as any);

    const wrapper = mount(CookieManager);
    await wrapper.find('.btn-danger').trigger('click');
    expect(dialogService.confirm).toHaveBeenCalledWith('Are you sure you want to delete this store?');
    expect(deleteStore).toHaveBeenCalledWith('1');
    expect(notificationService.error).toHaveBeenCalledWith('Failed to delete store: Invalid Store ID');
  });

  it('displays notification when no cookies exist in the current store', () => {
    const storeWithoutCookies = {
      id: '2',
      name: 'Empty Store',
      cookies: [],
      createdAt: Date.now(),
      updatedAt: Date.now()
    };
    vi.mocked(useCookieStore).mockReturnValue({
      stores: [storeWithoutCookies],
      currentStoreId: '2',
      currentStore: storeWithoutCookies,
      canCreateStore: true,
      createStore: vi.fn(),
      deleteStore: vi.fn()
    } as any);

    const wrapper = mount(CookieManager);
    wrapper.vm.selectStore('2');
    expect(wrapper.find('.cookie-item').exists()).toBe(false);
    expect(notificationService.error).toHaveBeenCalledWith('No cookies in this store.');
  });

  it('handles the maximum store limit gracefully', async () => {
    vi.mocked(useCookieStore).mockReturnValue({
      stores: new Array(10).fill(mockStore),
      currentStoreId: '10',
      currentStore: mockStore,
      canCreateStore: false,
      createStore: vi.fn(),
      deleteStore: vi.fn()
    } as any);

    mount(CookieManager);
    expect(notificationService.error).toHaveBeenCalledWith('Cannot create more than 10 stores.');
  });

  it('removes cookie correctly and notifies', async () => {
    // Mock the removeCookie function to resolve successfully
    vi.mocked(removeCookie).mockResolvedValue(undefined);
    
    // Mock the addCookies function to resolve successfully
    const addCookies = vi.fn().mockResolvedValue({});
    
    // Explicitly mock the dialog service to return true for confirmation
    vi.mocked(dialogService.confirm).mockReturnValue(true);
    
    // Mock the store with the necessary functions
    vi.mocked(useCookieStore).mockReturnValue({
      stores: [mockStore],
      currentStoreId: '1',
      currentStore: mockStore,
      canCreateStore: true,
      createStore: vi.fn(),
      deleteStore: vi.fn(),
      addCookies
    } as any);

    // Mount the component
    const wrapper = mount(CookieManager);
    
    // Directly call the removeCookie function with the first cookie
    await wrapper.vm.removeCookie(mockStore.cookies[0]);
    
    // Verify that the removeCookie function was called
    expect(removeCookie).toHaveBeenCalled();
    
    // Verify that the addCookies function was called
    expect(addCookies).toHaveBeenCalled();
    
    // Verify that the success notification was called
    expect(notificationService.success).toHaveBeenCalledWith('Cookie removed successfully!');
  });

  it('displays error when removing a non-existent cookie', async () => {
    vi.mocked(removeCookie).mockRejectedValue(new Error('Cookie not found'));
    const addCookies = vi.fn().mockResolvedValue({});
    vi.mocked(useCookieStore).mockReturnValue({
      stores: [mockStore],
      currentStoreId: '1',
      currentStore: mockStore,
      canCreateStore: true,
      createStore: vi.fn(),
      deleteStore: vi.fn(),
      addCookies
    } as any);

    const wrapper = mount(CookieManager);
    const cookieItem = wrapper.find('.cookie-item');
    await cookieItem.find('.btn-danger').trigger('click');
    expect(removeCookie).toHaveBeenCalled();
    expect(notificationService.error).toHaveBeenCalledWith('Failed to remove cookie: Cookie not found');
  });
}); 