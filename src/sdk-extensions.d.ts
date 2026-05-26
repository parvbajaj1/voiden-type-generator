import type { PluginContext as BasePluginContext } from "@voiden/sdk/ui";

declare module "@voiden/sdk/ui" {
  interface UIComponents {
    CodeEditor: React.ComponentType<{
      readOnly?: boolean;
      lang?: string;
      value?: string;
      onChange?: (value: string) => void;
      showReplace?: boolean;
    }>;
  }

  interface PluginContextUI {
    components: UIComponents;
    openRightPanel: () => void;
    openRightSidebarTab: (id: string) => void;
    showToast: (message: string, type?: "info" | "success" | "warning" | "error") => void;
  }

  interface PluginContext {
    onBuildRequest: (
      handler: (request: Record<string, any>) => any
    ) => void;
    onProcessResponse: (
      handler: (response: {
        body: string | object;
        status: number;
        __sectionLabel?: string;
      }) => void
    ) => void;
    registerSidebarTab: (side: "left" | "right", config: {
      id: string;
      title: string;
      icon: string;
      component: React.ComponentType<any>;
    }) => void;
    project: {
      getActiveEditor: (type: "voiden" | "code") => any;
    };
    ui: PluginContextUI;
  }
}
