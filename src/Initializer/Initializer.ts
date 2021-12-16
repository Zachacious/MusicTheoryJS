const initializers: { (): void }[] = [];

const registerInitializer = (initializer: { (): void }) => {
   if (!initializer) throw new Error("Initializer must be a function");
   initializers.push(initializer);
};

const init = (initCB: () => (void | Promise<void>) | undefined) => {
   for (const initializer of initializers) {
      initializer();
   }
   // initializers.forEach(async (initializer) => await initializer());
   if (initCB) initCB();
};

const initAsync = async (initCB: () => (void | Promise<void>) | undefined) => {
   for (const initializer of initializers) {
      initializer();
   }
   // initializers.forEach(async (initializer) => await initializer());
   if (initCB) initCB();
};

export { registerInitializer, init, initAsync };
