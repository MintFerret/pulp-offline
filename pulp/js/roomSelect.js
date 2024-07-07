(() => {
    // be clear about which parts of Pulp this plugin is looking at
    const _observedState = {
        activeRoomID: null,
        roomTiles: null,
        tiles: null,
        wallImageDatas: null,
        frameImageDatas: null,
        exits: null,
        exitImageDatas: null,
        exitImageDatasArmed: null,
        showWalls: false,
        player: null,
        rooms: null,
    };

    const _refreshObservedState = () => {
        _observedState.activeRoomID = data.editor.activeRoomId;
        _observedState.showWalls = data.editor.showWalls;
        _observedState.tiles = data.tiles;
        _observedState.frameImageDatas = window.frameImageDatas;
        _observedState.wallImageDatas = window.wallImageDatas;
        _observedState.rooms = data.rooms;
        _observedState.roomTiles =
            data.rooms[_observedState.activeRoomID].tiles;
        _observedState.exitImageDatas = window.exitImageDatas;
        _observedState.exitImageDatasArmed = window.exitImageDatasArmed;
        _observedState.exits = data.rooms[_observedState.activeRoomID].exits;
        _observedState.player = data.player;
    };

    const CONSTANTS = {
        renderedPixelsPerTile: 32,
        tileSize: 8,
        width: 25,
        height: 15,
    };

    const DOM = {
        loaded: false,
        selectionBoxNode: null,
        roomImageDOMNode: null,
        cachedSelectionImage: null,
        gridNode: null,
    };

    const Actions = {
        deselect: "deselect",
        startSelection: "startSelection",
        changeSelection: "changeSelection",
        finalizeSelection: "finalizeSelection",
        grabSelection: "grabSelection",
        moveSelection: "moveSelection",
        dropSelection: "dropSelection",
        copy: "copy",
        cut: "cut",
        paste: "paste",
        backspace: "backspace",
        // undo/redo actions
        undoCut: "undoCut",
        redoCut: "redoCut",
        unliftSelection: "unliftSelection",
        reliftSelection: "reliftSelection",
        undoPaste: "undoPaste",
        redoPaste: "redoPaste",
        redoSelectionDrag: "redoSelectionDrag",
        undoSelectionDrag: "undoSelectionDrag",
        redoApplyData: "redoApplyData",
        undoApplyData: "undoApplyData",
        clearSelection: "clearSelection",
        createSelection: "createSelection",
        clearCapture: "clearCapture",
        restoreCapture: "restoreCapture",
        deleteRoomSelection: "deleteRoomSelection",
        unDeleteRoomSelection: "unDeleteRoomSelection",
        // special case for resetting everything when data is imported
        reset: "reset",
    };

    const deepClone = (data) => JSON.parse(JSON.stringify(data));

    const initialSelection = {
        start: { x: -1, y: -1 },
        end: { x: -1, y: -1 },
        dragStart: { x: -1, y: -1 },
        capturedData: {
            tiles: [],
            exits: [],
        },
        captured: false,
        finalized: false,
        grabbed: false,
    };
    const initialState = {
        selection: {
            ...initialSelection,
        },
        mouse: {
            down: false,
            x: -1,
            y: -1,
        },
        clipboard: null,
    };
    let state = {
        ...initialState,
    };

    function tileIndexForCoordinates(x, y) {
        return y * CONSTANTS.width + x;
    }

    function inBounds(bounds, x, y) {
        return (
            x >= bounds.left &&
            x <= bounds.left + bounds.width &&
            y >= bounds.top &&
            y <= bounds.top + bounds.height
        );
    }

    const Pulp = {
        rerender: function () {
            window.syncExitProperties();
            return window.renderRoom();
        },
        activateRoomTool: function (toolID) {
            window.setActiveToolMode("room", toolID);
        },
        pushHistory: function () {
            // augment the history push to additionally restore tools. magic magic
            // when you undo something you want to go back to the tool that was being used
            // at the time that the entry was pushed on the stack (which is right now)
            // when you REDO something you want to go back to the tool that was used when the
            // undo entry was last popped off the stack.
            // we have to skip overrides because undoing uses cmd, so that gives you hand.
            const getToolID = () => {
                const currentToolName = window.getToolModeNoOverrides("room");
                return window.getToolModeId("room", currentToolName);
            };
            let lastUsedToolID = getToolID();
            const currentToolID = (lastUsedToolID = getToolID());
            const redoFunction = arguments[1];
            const undoFunction = arguments[2];
            const augmented = [
                arguments[0],
                function () {
                    setActiveToolMode("room", lastUsedToolID, true);
                    redoFunction();
                },
                function () {
                    lastUsedToolID = getToolID();
                    setActiveToolMode("room", currentToolID, true);
                    undoFunction();
                },
                ...[...arguments].slice(3),
            ];
            return window.pushHistory(...augmented);
        },
        usingLasso: function () {
            return getToolMode("room") === "lasso";
        },
        usingLassoNoOverrides: function () {
            return getToolModeNoOverrides("room") === "lasso";
        },
        copyCapturedDataToRoom: function (
            bounds,
            capturedData,
            destinationX,
            destinationY
        ) {
            _refreshObservedState();
            // return the previous values for undoing/redoing.
            const overwrittenTileData = new Array(bounds.height)
                .fill(0)
                .map((_) => new Array(bounds.width).fill(0));
            const overwrittenExitData = [];
            const overwrittenExitDestinations = [];
            for (let row = 0; row < bounds.height; row++) {
                for (let col = 0; col < bounds.width; col++) {
                    const destinationCol = destinationX + col;
                    const destinationRow = destinationY + row;
                    const destinationI = tileIndexForCoordinates(
                        destinationCol,
                        destinationRow
                    );
                    // prevent writing out of bounds
                    if (destinationI >= _observedState.roomTiles.length) {
                        continue;
                    }
                    overwrittenTileData[row][col] =
                        _observedState.roomTiles[destinationI];
                    _observedState.roomTiles[destinationI] =
                        capturedData.tiles[row][col];
                }
            }
            // first, check which exits are being clobbered.
            for (let i = 0; i < _observedState.exits.length; ) {
                const exit = _observedState.exits[i];
                const { x, y } = exit;
                if (
                    inBounds(
                        {
                            ...bounds,
                            width: bounds.width - 1,
                            height: bounds.height - 1,
                        },
                        x,
                        y
                    ) &&
                    !Object.hasOwn(exit, "edge")
                ) {
                    // later, this exit might be restored with another call to copyCapturedDataToRoom,
                    // which assumes that exits have been offset to be relative to the room's bounds
                    overwrittenExitData.push({
                        ...exit,
                        x: x - destinationX,
                        y: y - destinationY,
                    });
                    _observedState.exits.splice(i, 1);
                    Pulp.correctExitIDs(_observedState.exits);
                } else {
                    i++;
                }
            }
            capturedData.exits.forEach((exit, i) => {
                const { x, y } = exit;
                const newX = x + destinationX;
                const newY = y + destinationY;
                _observedState.exits.splice(exit.id, 0, {
                    ...exit,
                    x: newX,
                    y: newY,
                });
                Pulp.correctExitIDs(_observedState.exits);
            });
            _observedState.rooms.forEach((room) => {
                if (room === false) {
                    return;
                }
                for (let i = 0; i < room.exits.length; ) {
                    const exit = room.exits[i];
                    if (
                        exit.room === _observedState.activeRoomID &&
                        inBounds(
                            {
                                ...bounds,
                                width: bounds.width - 1,
                                height: bounds.height - 1,
                            },
                            exit.tx,
                            exit.ty
                        )
                    ) {
                        overwrittenExitDestinations.push({
                            ...exit,
                            sourceRoom: room.id,
                            tx: exit.tx - destinationX,
                            ty: exit.ty - destinationY,
                        });
                        room.exits.splice(i, 1);
                    } else {
                        i++;
                    }
                }
            });
            // before copying down exit destinations, check to see if any existing exit
            // destinations are being clobbered
            capturedData.exitDestinations.forEach((exit, i) => {
                const { tx, ty } = exit;
                const newTx = tx + destinationX;
                const newTy = ty + destinationY;
                // dont write sourceRoom to data
                const { sourceRoom, ...exitToWrite } = exit;
                _observedState.rooms[sourceRoom].exits.splice(exit.id, 0, {
                    ...exitToWrite,
                    tx: newTx,
                    ty: newTy,
                });
            });
            return {
                tiles: overwrittenTileData,
                exits: overwrittenExitData,
                exitDestinations: overwrittenExitDestinations,
            };
        },
        clearRoomInSelection: function (selection) {
            const bounds = selectionBounds(selection);
            for (let row = 0; row < bounds.height; row++) {
                for (let col = 0; col < bounds.width; col++) {
                    const x = bounds.left + col;
                    const y = bounds.top + row;
                    const i = tileIndexForCoordinates(x, y);
                    _observedState.roomTiles[i] = 0;
                }
            }
            for (let i = 0; i < _observedState.exits.length; ) {
                const exit = _observedState.exits[i];
                const { x, y } = exit;
                if (
                    inBounds(
                        {
                            ...bounds,
                            width: bounds.width - 1,
                            height: bounds.height - 1,
                        },
                        x,
                        y
                    ) &&
                    !Object.hasOwn(exit, "edge")
                ) {
                    _observedState.exits.splice(i, 1);
                    Pulp.correctExitIDs(_observedState.exits);
                } else {
                    i++;
                }
            }
            _observedState.rooms.forEach((room) => {
                if (room === false) {
                    return;
                }
                for (let i = 0; i < room.exits.length; ) {
                    const exit = room.exits[i];
                    if (
                        exit.room === _observedState.activeRoomID &&
                        inBounds(
                            {
                                ...bounds,
                                width: bounds.width - 1,
                                height: bounds.height - 1,
                            },
                            exit.tx,
                            exit.ty
                        )
                    ) {
                        room.exits.splice(i, 1);
                    } else {
                        i++;
                    }
                }
            });
        },
        captureRoomDataInSelection: function (selection) {
            _refreshObservedState();
            const bounds = selectionBounds(selection);
            const capturedData = {
                tiles: new Array(bounds.height)
                    .fill(0)
                    .map((row) => new Array(bounds.width).fill(0)),
                exits: [],
                exitDestinations: [],
            };
            for (let row = 0; row < bounds.height; row++) {
                for (let col = 0; col < bounds.width; col++) {
                    const x = bounds.left + col;
                    const y = bounds.top + row;
                    const i = tileIndexForCoordinates(x, y);
                    capturedData.tiles[row][col] = _observedState.roomTiles[i];
                }
            }
            _observedState.exits.forEach((exit) => {
                const { x, y } = exit;
                if (Object.hasOwn(exit, "edge")) {
                    return;
                }
                // blah; bounds are always 1 wider than the selection.
                if (
                    inBounds(
                        {
                            ...bounds,
                            width: bounds.width - 1,
                            height: bounds.height - 1,
                        },
                        x,
                        y
                    )
                ) {
                    // offset x and y so they're relative to the origin of the selection.
                    // this matches how tiles are handled, and makes re-placing the exits
                    // more straightforward
                    capturedData.exits.push({
                        ...exit,
                        x: x - bounds.left,
                        y: y - bounds.top,
                    });
                }
            });
            _observedState.rooms.forEach((room) => {
                if (room === false) {
                    return;
                }
                const exits = room.exits;
                exits.forEach((exit) => {
                    if (
                        (exit.room === _observedState.activeRoomID) &
                        inBounds(
                            {
                                ...bounds,
                                width: bounds.width - 1,
                                height: bounds.height - 1,
                            },
                            exit.tx,
                            exit.ty
                        )
                    ) {
                        capturedData.exitDestinations.push({
                            ...exit,
                            sourceRoom: room.id,
                            tx: exit.tx - bounds.left,
                            ty: exit.ty - bounds.top,
                        });
                    }
                });
            });
            return capturedData;
        },
        exitImageDataForExit: function (exit) {
            const exitType = window.getExitType(exit);
            const isConfigured = window.isExitConfigured(exit);
            // map from ExitType to Exit
            let imageID = 0;
            if (isConfigured) {
                imageID = exitType + 1;
            }
            return _observedState.exitImageDatasArmed[imageID];
        },
        correctExitIDs: function (exits) {
            exits.forEach((exit, i) => {
                exit.id = i;
            });
        },
    };

    function coordinatesInTarget(event) {
        const rect = event.target.getBoundingClientRect();
        const coords = {
            x: event.clientX - rect.left,
            y: event.clientY - rect.top,
        };
        return coords;
    }

    function outOfScreen(x, y) {
        return !(
            x >= 0 &&
            x <= CONSTANTS.width &&
            y >= 0 &&
            y <= CONSTANTS.height
        );
    }

    function shiftSelection(selection, dx, dy) {
        // never let the selection go outside of the bounds of the screen
        const bounds = selectionBounds(state.selection);
        const newTop = bounds.top + dy;
        const newLeft = bounds.left + dx;
        const newRight = newLeft + bounds.width;
        const newBottom = newTop + bounds.height;
        if (outOfScreen(newLeft, newTop) || outOfScreen(newRight, newBottom)) {
            return selection;
        }
        return {
            ...selection,
            start: {
                x: selection.start.x + dx,
                y: selection.start.y + dy,
            },
            end: {
                x: selection.end.x + dx,
                y: selection.end.y + dy,
            },
        };
    }

    function snapToGrid({ x, y }, gridSize) {
        return {
            x: Math.floor(x / gridSize),
            y: Math.floor(y / gridSize),
        };
    }

    function makeExitsUnique(exits) {
        _refreshObservedState();
        const maxExitID =
            1 +
            [..._observedState.exits, ...exits].reduce(function (max, exit) {
                return Math.max(max, exit.id);
            }, 0);
        return exits.map(function (exit, i) {
            return {
                ...exit,
                id: maxExitID + i,
            };
        });
    }

    /**
     * Captures a visual representation of the underlying room into a DOM node.
     * @param {Object} bounds
     */
    function captureRoomImageIntoDragNode(selection) {
        const roomImageCanvas = document.createElement("canvas");
        const roomImageContext = roomImageCanvas.getContext("2d");
        roomImageCanvas.width = CONSTANTS.tileSize * CONSTANTS.width;
        roomImageCanvas.height = CONSTANTS.tileSize * CONSTANTS.height;
        roomImageContext.drawImage(DOM.roomImageDOMNode, 0, 0);

        const bounds = selectionBounds(selection);
        const extractedCanvas = document.createElement("canvas");
        extractedCanvas.width = bounds.width * CONSTANTS.tileSize;
        extractedCanvas.height = bounds.height * CONSTANTS.tileSize;
        const targetCtx = extractedCanvas.getContext("2d");
        for (let row = 0; row < bounds.height; row++) {
            for (let col = 0; col < bounds.width; col++) {
                const tileID = selection.capturedData.tiles[row][col];
                const tile = _observedState.tiles[tileID];
                let data;
                if (tile.solid && _observedState.showWalls) {
                    // draw as wall
                    // not animating, sorry
                    data = _observedState.wallImageDatas[tile.frames[0]];
                } else {
                    // draw as flat
                    data = _observedState.frameImageDatas[tile.frames[0]];
                }
                targetCtx.putImageData(
                    data,
                    col * CONSTANTS.tileSize,
                    row * CONSTANTS.tileSize
                );
            }
        }
        selection.capturedData.exits.forEach((exit) => {
            // at this point, captured exits have their x and y changed to be
            // relative to the origin of the bounds.
            const { x, y } = exit;
            const exitEdgeImageData = Pulp.exitImageDataForExit(exit);
            targetCtx.putImageData(
                exitEdgeImageData,
                x * CONSTANTS.tileSize,
                y * CONSTANTS.tileSize
            );
        });
        DOM.cachedSelectionImage.src = extractedCanvas.toDataURL();
        DOM.cachedSelectionImage.width =
            bounds.width * CONSTANTS.renderedPixelsPerTile;
        DOM.cachedSelectionImage.height =
            bounds.height * CONSTANTS.renderedPixelsPerTile;
    }

    function render(action, prevState, state) {
        if (!DOM.loaded) {
            return;
        }
        const bounds = selectionBounds(state.selection);
        // the selection node is position: absolute; so it will be positioned
        // relative to its earliest position: relative; ancestor. in our case,
        // that's the div.grid, which has a 4px padding.
        // to make everything line up, figure out how far offset the
        // roomImageNode is relative to its parent (the div.grid), then add the same offset.
        const gridNodeOffset = DOM.gridNode.getBoundingClientRect();
        const roomImageNodeOffset =
            DOM.roomImageDOMNode.getBoundingClientRect();
        const topOffset = Math.floor(
            roomImageNodeOffset.top - gridNodeOffset.top
        );
        const leftOffset = Math.floor(
            roomImageNodeOffset.left - gridNodeOffset.left
        );
        DOM.selectionBoxNode.style.left = `${
            bounds.left * CONSTANTS.renderedPixelsPerTile + leftOffset
        }px`;
        DOM.selectionBoxNode.style.top = `${
            bounds.top * CONSTANTS.renderedPixelsPerTile + topOffset
        }px`;
        DOM.selectionBoxNode.style.width = `${
            bounds.width * CONSTANTS.renderedPixelsPerTile
        }px`;
        DOM.selectionBoxNode.style.height = `${
            bounds.height * CONSTANTS.renderedPixelsPerTile
        }px`;
        // TODO: better indicator than this?
        if (state.selection.start.x === -1) {
            DOM.selectionBoxNode.style.opacity = 0;
        } else {
            DOM.selectionBoxNode.style.opacity = 100;
        }
        if (!prevState.selection.captured && state.selection.captured) {
            captureRoomImageIntoDragNode(state.selection);
            Pulp.rerender();
        }
        if (prevState.selection.captured && !state.selection.captured) {
            Pulp.rerender();
        }
        if (action.type === Actions.paste || action.type == Actions.redoPaste) {
            // reapply the land animation
            DOM.selectionBoxNode.classList.remove("land");
            setTimeout(function () {
                DOM.selectionBoxNode.classList.add("land");
            }, 0);
        }
        if (
            action.type === Actions.paste ||
            action.type === Actions.redoPaste ||
            action.type === Actions.undoPaste ||
            action.type === Actions.cut ||
            action.type === Actions.redoCut ||
            action.type === Actions.undoCut ||
            action.type === Actions.backspace ||
            action.type === Actions.unDeleteRoomSelection ||
            action.type === Actions.deleteRoomSelection
        ) {
            Pulp.rerender();
        }
        if (!state.selection.captured) {
            DOM.cachedSelectionImage.style.opacity = 0;
            DOM.cachedSelectionImage.style.boxShadow = "unset";
            DOM.selectionBoxNode.classList.remove("land");
        } else {
            DOM.cachedSelectionImage.style.opacity = 100;
            DOM.cachedSelectionImage.style.boxShadow = "1px 1px 8px 6px";
        }
    }

    function dispatch(action) {
        // in an ideal world this isn't necessary, but there appears to be some leaking happening
        // with capturedData not being changed.
        // this _shouldn't_ ever be super duper slow.
        state = deepClone(state);
        const newState = _update(state, action);
        console.log({
            action: action.type,
            data: action.data,
            state,
            newState,
        });
        render(action, state, newState);
        state = newState;
    }

    function selectionBounds(selection) {
        // sorts and stuff
        const xs = [selection.start.x, selection.end.x].sort((a, b) => a - b);
        const ys = [selection.start.y, selection.end.y].sort((a, b) => a - b);
        return {
            left: xs[0],
            top: ys[0],
            // always expand the size by 1; coordinates use Math.floor
            // for selection, so when selecting from right to left, it should round up.
            width: xs[1] - xs[0] + 1,
            height: ys[1] - ys[0] + 1,
        };
    }

    function coordinatesInSelection(selection, x, y, parentOffset) {
        // upscale x and y
        x *= CONSTANTS.renderedPixelsPerTile;
        y *= CONSTANTS.renderedPixelsPerTile;
        x += parentOffset.left;
        y += parentOffset.top;
        const rect = selection.getBoundingClientRect();
        return (
            x >= rect.left && x < rect.right && y >= rect.top && y < rect.bottom
        );
    }

    function copyDownData(state) {
        const bounds = selectionBounds(state.selection);
        if (bounds.width > 0) {
            return Pulp.copyCapturedDataToRoom(
                bounds,
                state.selection.capturedData,
                bounds.left,
                bounds.top
            );
        }
    }

    function _update(state, action) {
        switch (action.type) {
            case Actions.deselect: {
                if (state.selection.captured) {
                    const overwrittenData = copyDownData(state, action);
                    Pulp.pushHistory(
                        "deselect",
                        function () {
                            dispatch({
                                type: Actions.redoApplyData,
                                data: {
                                    selection: state.selection,
                                },
                            });
                        },
                        function () {
                            dispatch({
                                type: Actions.undoApplyData,
                                data: {
                                    overwrittenData,
                                    selection: {
                                        ...state.selection,
                                        // one little caveat; it's no fun to immediately be grabbing.
                                        grabbed: false,
                                    },
                                },
                            });
                        },
                        true,
                        false
                    );
                }
                return {
                    ...state,
                    selection: {
                        ...initialSelection,
                        capturedData: state.selection.capturedData,
                    },
                    mouse: {
                        ...initialState.mouse,
                    },
                };
            }
            case Actions.startSelection: {
                const { x, y } = action.data;
                return {
                    ...state,
                    mouse: {
                        ...state.mouse,
                        x,
                        y,
                        down: true,
                    },
                    selection: {
                        ...state.selection,
                        start: {
                            x,
                            y,
                        },
                        end: { x, y },
                    },
                };
            }
            case Actions.reliftSelection: {
                const capturedData = Pulp.captureRoomDataInSelection(
                    action.data.selection
                );
                Pulp.clearRoomInSelection(action.data.selection);
                return {
                    ...state,
                    selection: {
                        ...action.data.selection,
                        grabbed: false,
                        capturedData,
                    },
                };
            }
            case Actions.unliftSelection: {
                // not only unlift, but unselect as well.
                const bounds = selectionBounds(action.data.selection);
                Pulp.copyCapturedDataToRoom(
                    bounds,
                    action.data.capturedData,
                    bounds.left,
                    bounds.top
                );
                return {
                    ...state,
                    selection: {
                        ...initialSelection,
                    },
                };
            }
            case Actions.grabSelection: {
                action.data.event.preventDefault();
                action.data.event.stopPropagation();
                const { x, y } = action.data;
                const nextSelectionState = {
                    ...state.selection,
                };
                nextSelectionState.grabbed = true;
                if (!state.selection.grabbed) {
                    const bounds = selectionBounds(state.selection);
                    nextSelectionState.dragStart = {
                        x: bounds.left,
                        y: bounds.top,
                    };
                }
                if (!state.selection.captured) {
                    nextSelectionState.captured = true;
                    nextSelectionState.capturedData =
                        Pulp.captureRoomDataInSelection(nextSelectionState);
                    Pulp.clearRoomInSelection(nextSelectionState);
                    Pulp.pushHistory(
                        "lifted selection",
                        function () {
                            dispatch({
                                type: Actions.reliftSelection,
                                data: {
                                    selection: nextSelectionState,
                                },
                            });
                        },
                        function () {
                            dispatch({
                                type: Actions.unliftSelection,
                                data: {
                                    capturedData:
                                        nextSelectionState.capturedData,
                                    selection: { ...state.selection },
                                },
                            });
                        },
                        true,
                        false
                    );
                }
                return {
                    ...state,
                    mouse: {
                        ...state.mouse,
                        x,
                        y,
                        down: true,
                    },
                    selection: nextSelectionState,
                };
            }
            case Actions.moveSelection: {
                const { x, y } = action.data;
                const newMouseState = {
                    ...state.mouse,
                    x,
                    y,
                };
                const dx = x - state.mouse.x;
                const dy = y - state.mouse.y;
                if (dx === 0 && dy === 0) {
                    return {
                        ...state,
                        mouse: newMouseState,
                    };
                } else {
                    return {
                        ...state,
                        mouse: newMouseState,
                        selection: shiftSelection(state.selection, dx, dy),
                    };
                }
            }
            case Actions.changeSelection: {
                const { x, y } = action.data;
                return {
                    ...state,
                    mouse: { ...state.mouse, x, y },
                    selection: {
                        ...state.selection,
                        end: { x, y },
                    },
                };
            }
            case Actions.dropSelection: {
                const nextState = {
                    ...state,
                    mouse: {
                        ...state.mouse,
                        down: false,
                    },
                    selection: {
                        ...state.selection,
                        grabbed: false,
                    },
                };
                Pulp.pushHistory(
                    "drag selection",
                    function () {
                        dispatch({
                            type: Actions.redoSelectionDrag,
                            data: {
                                selection: {
                                    ...nextState.selection,
                                },
                            },
                        });
                    },
                    function () {
                        dispatch({
                            type: Actions.undoSelectionDrag,
                            data: {
                                selection: { ...state.selection },
                            },
                        });
                    },
                    true,
                    false
                );
                return nextState;
            }
            case Actions.finalizeSelection: {
                const nextState = {
                    ...state,
                    mouse: {
                        ...state.mouse,
                        down: false,
                    },
                    selection: {
                        ...state.selection,
                        grabbed: false,
                        finalized: true,
                    },
                };
                Pulp.pushHistory(
                    "create selection",
                    function () {
                        dispatch({
                            type: Actions.createSelection,
                            data: {
                                selection: {
                                    ...nextState.selection,
                                },
                            },
                        });
                    },
                    function () {
                        dispatch({
                            type: Actions.clearSelection,
                            data: {
                                selection: {
                                    ...state.selection,
                                    // one little caveat; it's no fun to immediately be grabbing.
                                    grabbed: false,
                                },
                            },
                        });
                    },
                    true,
                    false
                );
                return nextState;
            }
            case Actions.redoSelectionDrag: {
                let nextSelectionState = { ...action.data.selection };
                return {
                    ...state,
                    selection: { ...nextSelectionState },
                };
            }
            case Actions.undoSelectionDrag: {
                const newSelectionOrigin = {
                    ...action.data.selection.dragStart,
                };
                const bounds = selectionBounds(action.data.selection);
                return {
                    ...state,
                    selection: {
                        ...action.data.selection,
                        grabbed: false,
                        start: {
                            x: newSelectionOrigin.x,
                            y: newSelectionOrigin.y,
                        },
                        // bounds are always 1 square wider than the selection.
                        end: {
                            x: newSelectionOrigin.x + bounds.width - 1,
                            y: newSelectionOrigin.y + bounds.height - 1,
                        },
                    },
                };
            }
            case Actions.redoApplyData: {
                const dataToRewrite = action.data.selection.capturedData;
                const bounds = selectionBounds(action.data.selection);
                Pulp.copyCapturedDataToRoom(
                    bounds,
                    dataToRewrite,
                    bounds.left,
                    bounds.top
                );
                return {
                    ...state,
                    selection: {
                        ...initialSelection,
                    },
                };
            }
            case Actions.undoApplyData: {
                const dataToRewrite = action.data.overwrittenData;
                const bounds = selectionBounds(action.data.selection);
                Pulp.copyCapturedDataToRoom(
                    bounds,
                    dataToRewrite,
                    bounds.left,
                    bounds.top
                );
                return {
                    ...state,
                    selection: {
                        ...action.data.selection,
                    },
                };
            }
            case Actions.clearSelection: {
                return {
                    ...state,
                    selection: {
                        ...initialSelection,
                    },
                };
            }
            case Actions.createSelection: {
                const nextSelectionState = { ...action.data.selection };
                return {
                    ...state,
                    selection: {
                        ...nextSelectionState,
                    },
                };
            }
            case Actions.reset: {
                return { ...initialState };
            }
            case Actions.copy: {
                // if there's already capture data, use that.
                const capturedData = state.selection.captured
                    ? state.selection.capturedData
                    : Pulp.captureRoomDataInSelection(state.selection, true);
                return {
                    ...state,
                    selection: {
                        ...state.selection,
                    },
                    clipboard: capturedData,
                };
            }
            case Actions.cut: {
                // if there's already capture data, that should be cut instead.
                if (state.selection.captured) {
                    Pulp.pushHistory(
                        "cut",
                        function () {
                            // this is just a clear selection. you can't get the clipboard back, sorry friend
                            dispatch({
                                type: Actions.clearSelection,
                            });
                        },
                        function () {
                            dispatch({
                                type: Actions.createSelection,
                                data: {
                                    selection: state.selection,
                                },
                            });
                        },
                        true,
                        false
                    );
                    return {
                        ...state,
                        selection: {
                            ...initialSelection,
                        },
                        clipboard: state.selection.capturedData,
                    };
                } else {
                    const capturedData = Pulp.captureRoomDataInSelection(
                        state.selection
                    );
                    Pulp.clearRoomInSelection(state.selection);
                    Pulp.pushHistory(
                        "destructive cut",
                        function () {
                            dispatch({
                                type: Actions.redoCut,
                                data: {
                                    destructive: true,
                                    selection: state.selection,
                                    capturedData,
                                },
                            });
                        },
                        function () {
                            dispatch({
                                type: Actions.undoCut,
                                data: {
                                    destructive: true,
                                    selection: state.selection,
                                    capturedData,
                                },
                            });
                        },
                        true,
                        false
                    );
                    return {
                        ...state,
                        selection: {
                            ...initialSelection,
                        },
                        clipboard: capturedData,
                    };
                }
            }
            case Actions.undoCut: {
                if (action.data.destructive) {
                    const bounds = selectionBounds(action.data.selection);
                    Pulp.copyCapturedDataToRoom(
                        bounds,
                        action.data.capturedData,
                        bounds.left,
                        bounds.top
                    );
                }
                return {
                    ...state,
                    selection: {
                        ...action.data.selection,
                    },
                };
            }
            case Actions.redoCut: {
                if (action.data.destructive) {
                    const capturedData = Pulp.captureRoomDataInSelection(
                        state.selection
                    );
                    Pulp.clearRoomInSelection(state.selection);
                }
                return {
                    ...state,
                    selection: {
                        ...initialSelection,
                    },
                };
            }
            case Actions.backspace: {
                if (state.selection.captured) {
                    // uncapture the selection
                    Pulp.pushHistory(
                        "cleared capture",
                        function () {
                            dispatch({
                                type: Actions.clearCapture,
                            });
                        },
                        function () {
                            dispatch({
                                type: Actions.restoreCapture,
                                data: {
                                    selection: state.selection,
                                },
                            });
                        },
                        true,
                        false
                    );
                    return {
                        ...state,
                        selection: {
                            ...initialSelection,
                        },
                    };
                } else if (state.selection.finalized) {
                    const capturedData = Pulp.captureRoomDataInSelection(
                        state.selection
                    );
                    Pulp.clearRoomInSelection(state.selection);
                    Pulp.pushHistory(
                        "deleted room selection",
                        function () {
                            dispatch({
                                type: Actions.deleteRoomSelection,
                                data: {
                                    selection: state.selection,
                                },
                            });
                        },
                        function () {
                            dispatch({
                                type: Actions.unDeleteRoomSelection,
                                data: {
                                    selection: state.selection,
                                    capturedData,
                                },
                            });
                        }
                    );
                    return {
                        ...state,
                        selection: {
                            ...initialSelection,
                        },
                    };
                }
            }
            case Actions.deleteRoomSelection: {
                Pulp.clearRoomInSelection(action.data.selection);
                return {
                    ...state,
                    selection: {
                        ...initialSelection,
                    },
                };
            }
            case Actions.unDeleteRoomSelection: {
                const nextState = {
                    ...state,
                    selection: action.data.selection,
                };
                const bounds = selectionBounds(nextState.selection);
                Pulp.copyCapturedDataToRoom(
                    bounds,
                    action.data.capturedData,
                    bounds.left,
                    bounds.top
                );
                return {
                    ...state,
                    selection: action.data.selection,
                };
            }
            case Actions.clearCapture: {
                return {
                    ...state,
                    selection: {
                        ...initialSelection,
                    },
                };
            }
            case Actions.restoreCapture: {
                return {
                    ...state,
                    selection: action.data.selection,
                };
            }
            case Actions.paste: {
                if (!state.clipboard) {
                    return state;
                }
                // the selection needs to be expanded to bound the captured data.
                const bounds = selectionBounds(state.selection);
                bounds.left = Math.max(0, bounds.left);
                bounds.top = Math.max(0, bounds.top);
                const capturedDataHeight = state.clipboard.tiles.length;
                const capturedDataWidth = state.clipboard.tiles[0].length;

                const newState = {
                    ...state,
                    selection: {
                        ...state.selection,
                        start: {
                            x: bounds.left,
                            y: bounds.top,
                        },
                        end: {
                            x: bounds.left + capturedDataWidth - 1,
                            y: bounds.top + capturedDataHeight - 1,
                        },
                        captured: true,
                        finalized: true,
                        capturedData: state.clipboard,
                    },
                };
                if (state.selection.captured) {
                    const overwrittenData = copyDownData(newState);
                    Pulp.pushHistory(
                        "paste",
                        function () {
                            dispatch({
                                type: Actions.redoPaste,
                                data: {
                                    bounds,
                                    capturedData: state.selection.capturedData,
                                    selection: newState.selection,
                                },
                            });
                        },
                        function () {
                            dispatch({
                                type: Actions.undoPaste,
                                data: {
                                    selection: state.selection,
                                    overwrittenData,
                                },
                            });
                        },
                        function () {},
                        true,
                        false
                    );
                } else {
                    Pulp.pushHistory(
                        "paste",
                        function () {
                            dispatch({
                                type: Actions.redoPaste,
                                data: {
                                    bounds,
                                    selection: newState.selection,
                                },
                            });
                        },
                        function () {
                            dispatch({
                                type: Actions.undoPaste,
                                data: {
                                    selection: state.selection,
                                },
                            });
                        },
                        function () {},
                        true,
                        false
                    );
                }
                return newState;
            }
            case Actions.redoPaste: {
                const dataToRewrite = action.data.capturedData;
                if (dataToRewrite) {
                    const selectionBounds = action.data.bounds;
                    Pulp.copyCapturedDataToRoom(
                        selectionBounds,
                        dataToRewrite,
                        selectionBounds.left,
                        selectionBounds.top
                    );
                }
                return {
                    ...state,
                    selection: {
                        ...state.selection,
                        ...action.data.selection,
                    },
                };
            }
            case Actions.undoPaste: {
                const dataToRewrite = action.data.overwrittenData;
                if (dataToRewrite) {
                    const selection = action.data.selection;
                    const bounds = selectionBounds(selection);
                    Pulp.copyCapturedDataToRoom(
                        bounds,
                        dataToRewrite,
                        bounds.left,
                        bounds.top
                    );
                }
                return {
                    ...state,
                    selection: {
                        ...state.selection,
                        ...action.data.selection,
                    },
                };
            }
            default:
                return state;
        }
    }

    function initialize(first) {
        _refreshObservedState();
        DOM.loaded = true;
        DOM.roomImageDOMNode = one("#room");
        DOM.selectionBoxNode = one("#room-selection-box");
        DOM.cachedSelectionImage = one("#cached-selection-image");
        DOM.gridNode = one("#room-grid");
        DOM.roomImageDOMNode.classList.add("cursorUnset");

        if (first) {
            pubsub.subscribe("pulp:willChangeRoom", function (event) {
                // proxying data.editor.activeRoomId isn't enough, since the undo stack
                // is modified before the roomId changes. that leads to an undo stack like:
                // 1. deslect 2. change room 3. create selection.
                // pubsub acts before the undo stack is modified, so it ends up with
                // 1. change room 2. deselect 3. create selection
                // before refreshing observed state, make sure to flush any selections.
                dispatch({ type: Actions.deselect });
                _refreshObservedState();
            });
            pubsub.subscribe("pulp:setActiveToolMode", function (event, data) {
                if (data.name === "room" && data.newModeId !== 2) {
                    DOM.roomImageDOMNode.classList.replace(
                        "cursorHand",
                        "cursorUnset"
                    );
                    DOM.roomImageDOMNode.classList.replace(
                        "cursorGrabbing",
                        "cursorUnset"
                    );
                    dispatch({
                        type: Actions.deselect,
                    });
                }
            });
            pubsub.subscribe("pulp:willSave", function (event, data) {
                dispatch({
                    type: Actions.deselect,
                });
            });
            pubsub.subscribe("pulp:willReplaceDOM", function () {
                // abandon everything
                dispatch({ type: Actions.reset });
            });
            pubsub.subscribe("pulp:didReplaceDOM", function () {
                initialize(false);
                _refreshObservedState();
            });
        }
        document.addEventListener("keydown", function (e) {
            if (!Pulp.usingLassoNoOverrides()) {
                return;
            }
            switch (e.key) {
                case "Escape":
                    dispatch({
                        type: Actions.deselect,
                    });
                    break;
                case "Backspace":
                    dispatch({
                        type: Actions.backspace,
                    });
                    e.preventDefault();
                    e.stopPropagation();
                    break;
                default:
                    if (e.metaKey || e.ctrlKey) {
                        switch (e.key) {
                            case "v":
                                dispatch({
                                    type: Actions.paste,
                                });
                                e.preventDefault();
                                e.stopPropagation();
                                break;
                            case "c":
                                dispatch({
                                    type: Actions.copy,
                                });
                                e.preventDefault();
                                e.stopPropagation();
                                break;
                            case "x":
                                dispatch({
                                    type: Actions.cut,
                                });
                                e.preventDefault();
                                e.stopPropagation();
                                break;
                        }
                    }
            }
        });
        document.body.addEventListener("mousedown", function (e) {
            if (!DOM.roomImageDOMNode.contains(e.target)) {
                dispatch({
                    type: Actions.deselect,
                });
            }
        });
        DOM.roomImageDOMNode.addEventListener("mousedown", function (e) {
            if (!Pulp.usingLasso()) {
                return;
            }
            const { x, y } = snapToGrid(
                coordinatesInTarget(e),
                CONSTANTS.renderedPixelsPerTile
            );
            if (
                coordinatesInSelection(
                    DOM.selectionBoxNode,
                    x,
                    y,
                    DOM.roomImageDOMNode.getBoundingClientRect()
                )
            ) {
                DOM.roomImageDOMNode.classList.replace(
                    "cursorHand",
                    "cursorGrabbing"
                );
                dispatch({
                    type: Actions.grabSelection,
                    data: {
                        event: e,
                        x,
                        y,
                    },
                });
            } else if (state.selection.captured) {
                dispatch({
                    type: Actions.deselect,
                });
            } else {
                dispatch({
                    type: Actions.startSelection,
                    data: {
                        event: e,
                        x,
                        y,
                    },
                });
            }
        });
        DOM.roomImageDOMNode.addEventListener("mousemove", function (e) {
            if (!Pulp.usingLasso()) {
                return;
            }
            const { x, y } = snapToGrid(
                coordinatesInTarget(e),
                CONSTANTS.renderedPixelsPerTile
            );
            if (
                coordinatesInSelection(
                    DOM.selectionBoxNode,
                    x,
                    y,
                    DOM.roomImageDOMNode.getBoundingClientRect()
                ) &&
                state.selection.finalized
            ) {
                if (state.selection.grabbed) {
                    DOM.roomImageDOMNode.classList.replace(
                        "cursorHand",
                        "cursorGrabbing"
                    );
                } else {
                    DOM.roomImageDOMNode.classList.replace(
                        "cursorUnset",
                        "cursorHand"
                    );
                }
            } else {
                if (!state.selection.grabbed) {
                    DOM.roomImageDOMNode.classList.replace(
                        "cursorHand",
                        "cursorUnset"
                    );
                }
            }
            if (state.selection.grabbed) {
                dispatch({
                    type: Actions.moveSelection,
                    data: {
                        event: e,
                        x,
                        y,
                    },
                });
            } else if (state.mouse.down) {
                dispatch({
                    type: Actions.changeSelection,
                    data: {
                        event: e,
                        x,
                        y,
                    },
                });
            }
        });
        DOM.roomImageDOMNode.addEventListener("mouseup", function (e) {
            if (!Pulp.usingLasso()) {
                return;
            }
            const { x, y } = snapToGrid(
                coordinatesInTarget(e),
                CONSTANTS.renderedPixelsPerTile
            );
            if (state.selection.grabbed) {
                DOM.roomImageDOMNode.classList.replace(
                    "cursorGrabbing",
                    "cursorHand"
                );
                dispatch({
                    type: Actions.dropSelection,
                    data: {
                        event: e,
                        x,
                        y,
                    },
                });
            } else if (state.mouse.down) {
                dispatch({
                    type: Actions.finalizeSelection,
                    data: {
                        event: e,
                        x,
                        y,
                    },
                });
            }
        });
    }

    pubsub.subscribe("pulp:ready", function () {
        initialize(true);
    });
})();
