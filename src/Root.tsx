import React from "react";
import { Composition } from "remotion";
import { AnimatedScene } from "./Scene";
import { REMOTION_COMPOSITION_ID } from "./constants";

export const RemotionRoot: React.FC = () => (
  <>
    <Composition
      id={REMOTION_COMPOSITION_ID}
      component={AnimatedScene}
      durationInFrames={5400}
      fps={30}
      width={1920}
      height={1080}
      defaultProps={{
        title: "Dark Factory Render",
        accent: "#5ef1ff",
      }}
    />
  </>
);
