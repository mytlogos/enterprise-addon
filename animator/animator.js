const Animator = {
    /**
     * @type function
     */
    diagram: undefined,
    model: undefined, negateExpanded: function (node) {
        return node.isTreeExpanded = !node.isTreeExpanded;
    },

    //init diagram and model
    init() {
        let build = go.GraphObject.make;

        this.diagram = build(go.Diagram, "diagram", {
            "toolManager.hoverDelay": 100,
            initialDocumentSpot: go.Spot.Center,
            initialViewportSpot: go.Spot.Center,
            initialAutoScale: go.Diagram.Uniform,
        });
        this.model = build(go.TreeModel);

        this.diagram.model = this.model;

        this.diagram.nodeTemplate =
            build(go.Node, "Auto",
                // the entire node will have a light-blue background
                // {background: "#44CCFF"},
                build(go.Shape, "Rectangle",
                    {stroke: null, strokeWidth: 0},
                    /* reddish if highlighted, blue otherwise */
                    new go.Binding("fill", "isHighlighted", h => h ? "#F44336" : "#A7E7FC").ofObject()),
                build(go.Panel, "Vertical",
                    build(go.TextBlock,
                        "",  // the initial value for TextBlock.text
                        // some room around the text, a larger font, and a white stroke:
                        {margin: 10, stroke: "white", font: "bold 16px sans-serif"},
                        // TextBlock.text is data bound to the "name" attribute of the model data
                        new go.Binding("text", "tag")),
                    build(go.TextBlock,
                        "0",  // the initial value for TextBlock.text
                        // some room around the text, a larger font, and a white stroke:
                        {margin: 10, stroke: "white", font: "bold 16px sans-serif"},
                        // TextBlock.text is data bound to the "name" attribute of the model data
                        new go.Binding("text", "contentScore")),
                    build("TreeExpanderButton")),
                { // this tooltip shows the original (not clouded by children) details of item
                    toolTip:
                        build(go.Adornment, "Auto",
                            build(go.Shape, {fill: "lightyellow"}),
                            build(go.Panel, "Vertical",
                                tooltipText("css"),
                                tooltipText("contentScore"),
                                tooltipText("length"),
                                tooltipText("charCount"),
                                tooltipText("attributes"),
                            )),
                    click: function (event, node) {
                        Animator.onClick && typeof Animator.onClick === "function" && Animator.onClick(event, node);
                    },

                    mouseEnter: mouseEnter,
                    mouseLeave: mouseLeave

                    /*doubleClick: function (event, node) {
                        Animator.doTransaction(() => this.negateExpanded(node));
                    }*/
                }
            );

        this.diagram.layout = build(go.TreeLayout, {
            // properties for most of the tree:
            angle: 90,
            layerSpacing: 80,
        });

        this.diagram.linkTemplate =
            build(go.Link,
                {routing: go.Link.Orthogonal, corner: 5},
                build(go.Shape, {strokeWidth: 3, stroke: "#555"}));

        // define a second kind of Node:
        this.diagram.nodeTemplateMap.add("unScoreAble",
            build(go.Node, "Spot",
                {
                    deletable: false,
                    // isTreeExpanded: false,
                },
                build(go.Shape, "Circle",
                    {stroke: null, width: 50, height: 50},
                    /* reddish if highlighted, blue otherwise */
                    new go.Binding("fill", "isHighlighted", h => h ? "#F44336" : "#A7E7FC").ofObject(),
                ),
                build(go.TextBlock,
                    {font: "10pt Verdana, sans-serif", stroke: "white"},
                    new go.Binding("text", "tag")
                ),
                build("TreeExpanderButton"),
                {
                    toolTip:
                        build(go.Adornment, "Auto",
                            build(go.Shape, {fill: "lightyellow"}),
                            build(go.Panel, "Vertical",
                                tooltipText("css"),
                                tooltipText("length"),
                                tooltipText("charCount"),
                                tooltipText("attributes"),
                            )),

                    click: function (event, node) {
                        Animator.onClick && typeof Animator.onClick === "function" && Animator.onClick(event, node);
                    },

                    mouseEnter: mouseEnter,
                    mouseLeave: mouseLeave

                    /*doubleClick: function (event, node) {
                        Animator.doTransaction(() => this.negateExpanded(node));
                    }*/
                }));

        this.diagram.initialContentAlignment = go.Spot.TopCenter;
        this.diagram.undoManager.isEnabled = true;

        function tooltipText(binding) {
            return build(go.TextBlock, {margin: 5}, makeSubBinding("text", binding));
        }

        function makeSubBinding(targetName, sourceName, conversion) {
            let bind = new go.Binding(targetName, "details");
            bind.converter = function (details, target) {
                let value = details[sourceName];
                if (value === undefined) return target[targetName];
                return (typeof conversion === "function") ? conversion(value) : value;
            };
            return bind;
        }

        function mouseEnter(e, node) {
            try {
                sendMessage({flasher: {selector: node.data.selector}});
            } catch (e) {
                console.log(e);
            }
        }

        function mouseLeave() {
            try {
                sendMessage({flasher: {}});
            } catch (e) {
                console.log(e);
            }
        }
    },

    /**
     *
     * @param {TreeItem} treeItem
     * @return {{key: number, parent: *, tag: string, contentScore: number}}
     */
    getData(treeItem) {
        let data = {
            key: treeItem.id,
            tag: treeItem.info.tagName,
            contentScore: treeItem.info.contentScore,
            selector: treeItem.info.selector,

            details: {
                css: treeItem.ownInfo.css,
                contentScore: treeItem.ownInfo.contentScore,
                length: treeItem.ownInfo.lengthBonus,
                charCount: treeItem.ownInfo.contentCharCount,
                attributes: treeItem.ownInfo.classWeight,
            }
        };
        if (treeItem.parent) {
            data.parent = treeItem.parent.id;
        }
        if (!treeItem.info.scoreAble) {
            data.category = "unScoreAble";
        }
        return data;
    },

    onClick: undefined,

    highlightNode(id) {
        let newNode = this.diagram.findNodeForKey(id);

        this.doTransaction(() =>
            //highlight the new node
            this.diagram.highlight(newNode));

        //center the node
        this.diagram.centerRect(newNode.actualBounds);
    },

    /**
     *
     * @param {TreeItem} item
     */
    render(item) {
        //to avoid rendering the item multiple times just return? or throw error?
        if (item.rendered) {
            return;
        }
        let data = this.getData(item);
        this.doTransaction(() => {
            this.model.addNodeData(data);
            let node = this.diagram.findNodeForKey(data.key);
            //if there is a node, node is not scoreAble and not body(root), then negateExpanded
            node && !item.info.scoreAble && data.key && this.negateExpanded(node);
        });
        item.rendered = true;
    },

    /**
     *
     * @param {{id: number, contentScore: number}} content
     */
    update(content) {
        let node = this.diagram.findNodeForKey(content.id);

        this.doTransaction(() => {
            //todo update more than just contentScore
            this.model.setDataProperty(node.data, "contentScore", content.contentScore);
        });
    },

    doTransaction(doFunction) {
        if (!this.transaction) {
            this.model.startTransaction("updating content");
            doFunction();
            this.model.commitTransaction("updating content");
        } else {
            doFunction();
        }
    },

    startTransaction() {
        this.transaction = true;
        this.model.startTransaction("updating");
    },

    commitTransaction() {
        this.transaction = false;
        this.model.commitTransaction("updating");
    },

    clearHighlight() {
        this.doTransaction(() => this.diagram.clearHighlighteds())
    },

    clear() {
        this.diagram.clear();
    },
};

Animator.init();