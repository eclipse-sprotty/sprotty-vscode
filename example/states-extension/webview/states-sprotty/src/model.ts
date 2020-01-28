import { SGraphFactory, SChildElement, SModelElementSchema, SParentElement, SEdge } from "sprotty";

export class StatesModelFactory extends SGraphFactory {

    protected initializeChild(child: SChildElement, schema: SModelElementSchema, parent?: SParentElement): SChildElement {
        super.initializeChild(child, schema, parent);
        if (child instanceof SEdge)
            child.targetAnchorCorrection = Math.sqrt(5)
        return child
    }
}
