import { Composition, getStaticFiles } from "remotion";
import { EasyAiBrandIntro } from "./compositions/EasyAiBrandIntro";
import { EASY_AI_DURATION_FRAMES, EASY_AI_FORMATS, EASY_AI_FPS } from "./config/videoFormats";
import { AIVideo, aiVideoSchema } from "./components/AIVideo";
import { FPS, INTRO_DURATION } from "./lib/constants";
import { getTimelinePath, loadTimelineFromFile } from "./lib/utils";

export const RemotionRoot: React.FC = () => {
  const staticFiles = getStaticFiles();
  const timelines = staticFiles
    .filter((file) => file.name.endsWith("timeline.json"))
    .map((file) => file.name.split("/")[1]);

  return (
    <>
      {Object.values(EASY_AI_FORMATS).map((format) => (
        <Composition
          key={format.id}
          id={format.id}
          component={EasyAiBrandIntro}
          fps={EASY_AI_FPS}
          width={format.width}
          height={format.height}
          durationInFrames={EASY_AI_DURATION_FRAMES}
          defaultProps={{}}
        />
      ))}

      {timelines.map((storyName) => (
        <Composition
          key={storyName}
          id={storyName}
          component={AIVideo}
          fps={FPS}
          width={1080}
          height={1920}
          schema={aiVideoSchema}
          defaultProps={{
            timeline: null,
          }}
          calculateMetadata={async ({ props }) => {
            const { lengthFrames, timeline } = await loadTimelineFromFile(
              getTimelinePath(storyName),
            );

            return {
              durationInFrames: lengthFrames + INTRO_DURATION,
              props: {
                ...props,
                timeline,
              },
            };
          }}
        />
      ))}
    </>
  );
};
