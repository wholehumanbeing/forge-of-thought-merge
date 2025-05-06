import React from "react";
import { render } from "@testing-library/react";
import Scene3D from "../Scene3D";

// Simple smoke test ensuring the component renders without crashing
// Note: We pass minimal props to satisfy the component API.

describe("Scene3D", () => {
  it("renders without throwing", () => {
    const nodes = [];
    const { container } = render(
      <Scene3D nodes={nodes} />
    );

    // Expect the container to be in the document
    expect(container).toBeTruthy();
  });
}); 