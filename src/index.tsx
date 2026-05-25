import React from "react";
import type { PluginContext } from "@voiden/sdk/ui";
import type { CapturedResponse } from "./types/pluginTypes";
import { GenerateTab } from "./ui/GenerateTab";

const SIDEBAR_TAB_ID = "voiden-type-generator";

export default (ctx: PluginContext) => ({
  onload: async () => {
    const responseRef: { current: CapturedResponse | null } = { current: null };
    const pendingRequest = { url: "", method: "" };

    // Capture request URL and method — must return request to keep the pipeline intact
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

    // Register as a persistent right sidebar tab (lives alongside the response panel)
    ctx.registerSidebarTab("right", {
      id: SIDEBAR_TAB_ID,
      icon: "Braces",
      title: "Types",
      component: () => <GenerateTab getResponse={() => responseRef.current} />,
    });

    // Status bar button opens the right panel and switches to this tab
    (ctx as any).registerStatusBarItem({
      id: "voiden-type-generator-btn",
      icon: "Braces",
      label: "Types",
      tooltip: "Generate types from last response",
      position: "right",
      onClick: () => {
        ctx.ui.openRightSidebarTab(SIDEBAR_TAB_ID);
      },
    });
  },

  onunload: () => {
    // Voiden removes registered hooks and sidebar tabs automatically on plugin unload
  },
});
