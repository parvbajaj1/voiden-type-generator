import {
  quicktype,
  InputData,
  jsonInputForTargetLanguage,
} from "quicktype-core";

type RunQuicktypeArgs = {
  json: string;
  language: string;
  className: string;
  rendererOptions: Record<string, string>;
};

export async function runQuicktype({
  json,
  language,
  className,
  rendererOptions,
}: RunQuicktypeArgs): Promise<string> {
  // quicktype-core types lang as a string literal union; cast to satisfy it
  const input = await jsonInputForTargetLanguage(language as never);
  await input.addSource({ name: className, samples: [json] });

  const inputData = new InputData();
  inputData.addInput(input);

  const result = await quicktype({
    inputData,
    lang: language as never,
    rendererOptions,
    inferMaps: true,
    inferEnums: true,
    inferUuids: false,
    combineClasses: true,
    allPropertiesOptional: false,
  });

  return result.lines.join("\n");
}
