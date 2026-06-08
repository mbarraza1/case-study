// Minimal stub for next/navigation in jest/jsdom
export const useRouter = () => ({ push: jest.fn(), replace: jest.fn(), back: jest.fn() });
export const useSearchParams = () => new URLSearchParams();
export const usePathname = () => "/";
