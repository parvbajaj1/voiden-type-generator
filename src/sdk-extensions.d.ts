import type { PluginContext } from "@voiden/sdk/ui";

declare module "@voiden/sdk/ui" {
  interface PluginContext {
    onBuildRequest: (
      handler: (request: Record<string, any>, editor: any) => Promise<Record<string, any>> | Record<string, any>
    ) => void;
    onProcessResponse: (
      handler: (response: {
        body: string;
        status: number;
        statusText: string;
        headers: Record<string, string>;
        elapsedTime: number;
        __sectionIndex: number;
        __sectionColorIndex: number;
        __sectionLabel: string;
      }) => void
    ) => void;
    files: {
      read: (path: string) => Promise<string>;
    };
    project: {
      getActiveProject: () => Promise<string>;
      getVoidFiles: () => Promise<{ id: string; content: string }[]>;
      createFile: (path: string, content: string) => Promise<void>;
      openFile: (relativePath: string) => Promise<void>;
    };
    ui: {
      showToast: (message: string, type?: "info" | "success" | "warning" | "error") => void;
    };
  }
}
