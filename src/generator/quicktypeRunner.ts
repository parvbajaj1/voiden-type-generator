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
  const input = await jsonInputForTargetLanguage(language);
  await input.addSource({ name: className, samples: [json] });

  const inputData = new InputData();
  inputData.addInput(input);

  const result = await quicktype({
    inputData,
    lang: language,
    rendererOptions,
    inferMaps: true,
    inferEnums: true,
    inferUuids: false,
    inferDates: false,
    combineClasses: true,
    allPropertiesOptional: false,
  });

  return result.lines.join("\n");
}
