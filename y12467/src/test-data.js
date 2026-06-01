var TestData = (function () {

  function loadScenario_normal(app) {
    var maze = app.maze;
    MazeModel.resetMaze(maze);
    maze.lightAngle = 0;
    maze.target = { row: 2, col: 10 };
    MazeModel.placeElement(maze, 4, 3, 'mirror', { angle: 45 });
    MazeModel.placeElement(maze, 2, 3, 'mirror', { angle: 135 });
    MazeModel.placeElement(maze, 2, 7, 'lens', { angle: 90, focalLength: 10 });
    MazeModel.placeElement(maze, 4, 7, 'wall');
    app.runCheck();
    MazeRenderer.render(app.renderer);
    app.updateUI();
  }

  function loadScenario_supplement(app) {
    var maze = app.maze;
    MazeModel.resetMaze(maze);
    maze.lightAngle = 0;
    maze.target = { row: 2, col: 10 };
    MazeModel.placeElement(maze, 4, 3, 'mirror', { angle: 45 });
    MazeModel.placeElement(maze, 2, 3, 'mirror', { angle: 135 });
    MazeModel.placeElement(maze, 2, 7, 'lens', { angle: 90, focalLength: 0 });
    app.runCheck();
    MazeModel.supplementLens(maze, 2, 7, 12);
    var lastStepIdx = maze.steps.length - 1;
    var beamResult = OpticsPhysics.traceBeam(maze);
    MazeModel.markStepCalcTriggered(maze, lastStepIdx, beamResult);
    app.runCheck();
    MazeRenderer.render(app.renderer);
    app.updateUI();
  }

  function loadScenario_conflict(app) {
    var maze = app.maze;
    MazeModel.resetMaze(maze);
    maze.lightAngle = 0;
    maze.target = { row: 2, col: 10 };
    MazeModel.placeElement(maze, 4, 3, 'mirror', { angle: 30 });
    MazeModel.placeElement(maze, 2, 5, 'lens', { angle: 90, focalLength: 5 });
    MazeModel.placeElement(maze, 3, 8, 'wall');
    MazeModel.placeElement(maze, 2, 8, 'concave', { angle: 90, focalLength: 0 });
    app.runCheck();
    MazeRenderer.render(app.renderer);
    app.updateUI();
  }

  function loadScenario_export(app) {
    var maze = app.maze;
    MazeModel.resetMaze(maze);
    maze.lightAngle = 0;
    maze.target = { row: 2, col: 10 };
    MazeModel.placeElement(maze, 4, 3, 'mirror', { angle: 45 });
    MazeModel.placeElement(maze, 2, 3, 'mirror', { angle: 135 });
    MazeModel.placeElement(maze, 2, 7, 'lens', { angle: 90, focalLength: 10 });
    MazeModel.placeElement(maze, 4, 7, 'wall');
    MazeModel.placeElement(maze, 6, 5, 'mirror', { angle: 60 });
    MazeModel.placeElement(maze, 6, 8, 'concave', { angle: 90, focalLength: 8 });
    app.runCheck();
    MazeRenderer.render(app.renderer);
    app.updateUI();
    app.exportReport();
  }

  return {
    loadScenario_normal: loadScenario_normal,
    loadScenario_supplement: loadScenario_supplement,
    loadScenario_conflict: loadScenario_conflict,
    loadScenario_export: loadScenario_export
  };
})();
