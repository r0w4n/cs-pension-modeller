import "@testing-library/jest-dom/vitest";

let localStorageStore: Record<string, string> = {};

const localStorageMock = {
  getItem(key: string) {
    return localStorageStore[key] ?? null;
  },
  setItem(key: string, value: string) {
    localStorageStore[key] = value;
  },
  removeItem(key: string) {
    delete localStorageStore[key];
  },
  clear() {
    localStorageStore = {};
  },
};

Object.defineProperty(window, "localStorage", {
  value: localStorageMock,
  configurable: true,
});

// jsdom does not implement native dialog methods; browser tests cover focus and Escape.
HTMLDialogElement.prototype.showModal = function () {
  this.setAttribute("open", "");
};
HTMLDialogElement.prototype.close = function () {
  this.removeAttribute("open");
};
