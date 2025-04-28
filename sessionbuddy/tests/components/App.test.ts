import { describe, it, expect, vi } from 'vitest';
import { mount } from '@vue/test-utils';
import App from '@/App.vue';

// Mock the CookieManager component
vi.mock('@/components/CookieManager.vue', () => ({
  default: {
    name: 'CookieManager',
    template: '<div class="mock-cookie-manager">Mock Cookie Manager</div>'
  }
}));

describe('App', () => {
  it('renders properly', () => {
    const wrapper = mount(App);
    
    // Check if the header is rendered
    expect(wrapper.find('.app-header').exists()).toBe(true);
    expect(wrapper.find('.app-header h1').text()).toBe('Session Buddy');
    
    // Check if the CookieManager component is rendered
    expect(wrapper.find('.mock-cookie-manager').exists()).toBe(true);
    
    // Check if the footer is rendered
    expect(wrapper.find('.app-footer').exists()).toBe(true);
    expect(wrapper.find('.app-footer p').text()).toContain('Session Buddy');
  });
}); 