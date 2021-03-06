import "mobx-react-lite/batchingForReactDom";
import { Instance, onSnapshot, types } from "mobx-state-tree";
import { createContext, useContext } from "react";
import { TailwindConfig } from "../@types/tailwind";
import { PluginMessage } from "../code";
import { fetchConfigColors } from "../core/config";
import defaultConfig from "../generated/tw.min.json";

const RootModel = types
  .model({
    twPrefix: types.optional(types.string, ""),
    addSpaces: types.optional(types.boolean, false),
    overrideStyles: types.optional(types.boolean, false),
    configName: types.optional(types.maybeNull(types.string), null),
    errorMessage: types.optional(types.maybeNull(types.string), null),
  })
  .volatile(() => {
    const reader = new FileReader();
    const config: TailwindConfig = {
      theme: {},
      variants: {},
      plugins: [],
      darkMode: false,
      presets: [],
      variantOrder: [
        "first",
        "last",
        "odd",
        "even",
        "visited",
        "checked",
        "group-hover",
        "group-focus",
        "focus-within",
        "hover",
        "focus",
        "focus-visible",
        "active",
        "disabled",
      ],
    };
    return {
      reader,
      config,
    };
  })
  .views((self) => ({
    get loadedTailwindConfig(): TailwindConfig {
      return self.config;
    },
  }))
  .actions((self) => ({
    handleReadAbort: () => {
      alert("Read was aborted");
    },
    handleReadError: () => {
      alert("Read failed");
    },
    setAddSpaces: (value: boolean) => {
      self.addSpaces = value;
    },
    setOverrideStyles: (value: boolean) => {
      self.overrideStyles = value;
    },
    setTwPrefix: (prefix: string) => {
      self.twPrefix = prefix;
    },
    setConfig: (config: TailwindConfig) => {
      self.config = config;
    },
    setConfigName: (name: string | null) => {
      self.configName = name;
    },
    setErrorMessage: (msg: string | null) => {
      self.errorMessage = msg;
    },
    sendPluginMessage: (pluginMessage: PluginMessage) => {
      parent.postMessage(
        {
          pluginMessage,
        },
        "*"
      );
    },
  }))
  .actions((self) => ({
    afterCreate: () => {
      self.reader.onabort = (e) => self.handleReadAbort;
      self.reader.onerror = (e) => self.handleReadError;
      self.reader.onload = () => {
        const binaryString = self.reader.result as string;
        try {
          self.setConfig(JSON.parse(binaryString));
        } catch (error) {
          new Error(error);
          self.setErrorMessage("Parsing failed!");
        }
      };
    },
    readFile: (fileName: string, file: File) => {
      self.setErrorMessage(null);
      self.setConfigName(fileName);
      self.reader.readAsBinaryString(file);
    },
    loadDefaultStub: () => {
      self.setErrorMessage(null);
      self.setConfigName("Default Config");
      self.setConfig(defaultConfig);
    },
    addColorStyles: (prefix: string) => {
      self.sendPluginMessage({
        type: "ADD_COLORS",
        payload: {
          prefix: prefix,
          config: fetchConfigColors(self.config),
          overrideStyles: self.overrideStyles,
          addSpaces: self.addSpaces,
        },
      });
    },
  }));

export const rootStore = RootModel.create({});

onSnapshot(rootStore, (snapshot) => console.log("Snapshot: ", snapshot));

export type RootInstance = Instance<typeof RootModel>;
const RootStoreContext = createContext<null | RootInstance>(null);

export const Provider = RootStoreContext.Provider;
export function useMst() {
  const store = useContext(RootStoreContext);
  if (store === null) {
    throw new Error("Store cannot be null, please add a context provider");
  }
  return store as RootInstance;
}
