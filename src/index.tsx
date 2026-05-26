import React from "react";
import type { PluginContext } from "@voiden/sdk/ui";
import type { CapturedResponse } from "./types/pluginTypes";
import { GenerateTab } from "./ui/GenerateTab";

const TAB_ID = "voiden-type-generator";

export default (ctx: PluginContext) => ({
  onload: async () => {
    const responsesMap = new Map<string, CapturedResponse>();
    const pendingRequest = { url: "", method: "", docTabId: "" };
    const responseListeners = new Set<(r: CapturedResponse, tabId: string) => void>();

    // Capture the active document tab ID at the moment a request is sent
    ctx.onBuildRequest((request) => {
      pendingRequest.url = request?.url ?? "";
      pendingRequest.method = request?.method ?? "";
      const editor = ctx.project.getActiveEditor("voiden");
      pendingRequest.docTabId = (editor as any)?.storage?.tabId ?? "";
      return request;
    });

    ctx.onProcessResponse((response) => {
      const docTabId = pendingRequest.docTabId;
      const captured: CapturedResponse = {
        body: typeof response.body === "string"
          ? response.body
          : JSON.stringify(response.body),
        status: response.status,
        url: pendingRequest.url,
        method: pendingRequest.method,
        label: response.__sectionLabel ?? "",
      };
      if (docTabId) responsesMap.set(docTabId, captured);
      responseListeners.forEach((fn) => fn(captured, docTabId));
    });

    const subscribe = (fn: (r: CapturedResponse, tabId: string) => void) => {
      responseListeners.add(fn);
      return () => responseListeners.delete(fn);
    };

    const getResponseForTab = (tabId: string) => responsesMap.get(tabId) ?? null;

    // Returns the document tab ID of the currently active void file
    const getActiveTabId = () => {
      const editor = ctx.project.getActiveEditor("voiden");
      return (editor as any)?.storage?.tabId ?? "";
    };

    ctx.registerSidebarTab("right", {
      id: TAB_ID,
      title: "Types",
      icon: "Braces",
      component: () => React.createElement(GenerateTab, {
        subscribe,
        getResponseForTab,
        getActiveTabId,
        CodeEditor: ctx.ui.components.CodeEditor,
      }),
    });
  },

  onunload: () => {},
});
