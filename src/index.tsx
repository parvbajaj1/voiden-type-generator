import React from "react";
import type { PluginContext } from "@voiden/sdk/ui";
import type { CapturedResponse } from "./types/pluginTypes";
import { GenerateTab } from "./ui/GenerateTab";

const TAB_ID = "voiden-type-generator";

export default (ctx: PluginContext) => ({
  onload: async () => {
    // Mutable ref — safe to share across closures since Voiden is single-threaded UI
    const responseRef: { current: CapturedResponse | null } = { current: null };
    const pendingRequest = { url: "", method: "" };
    let cachedTabId: string | null = null;

    // Capture request URL and method, then return request unchanged to keep the pipeline intact
    ctx.onBuildRequest((request) => {
      pendingRequest.url = request?.url ?? "";
      pendingRequest.method = request?.method ?? "";
      return request;
    });

    // Capture response body and status after request completes
    ctx.onProcessResponse((response) => {
      responseRef.current = {
        body:
          typeof response.body === "string"
            ? response.body
            : JSON.stringify(response.body),
        status: response.status,
        url: pendingRequest.url,
        method: pendingRequest.method,
        label: response.__sectionLabel ?? "",
      };
    });

    function openTab() {
      if (!responseRef.current) {
        ctx.ui?.showToast?.("Run a request first to generate types.", "info");
        return;
      }

      // Re-activate tab if already open to avoid duplicates
      if (cachedTabId) {
        (window as any).electron?.tab?.activate("main", cachedTabId);
        return;
      }

      (ctx as any).addTab("main", {
        id: TAB_ID,
        icon: "Braces",
        title: "Type Generator",
        props: {},
        component: () => (
          <GenerateTab getResponse={() => responseRef.current} />
        ),
      });

      cachedTabId = TAB_ID;
    }

    (ctx as any).registerStatusBarItem({
      id: "voiden-type-generator-btn",
      icon: "Braces",
      label: "Types",
      tooltip: "Generate types from last response",
      position: "right",
      onClick: openTab,
    });
  },

  onunload: () => {
    // Voiden removes registered hooks automatically on plugin unload
  },
});
