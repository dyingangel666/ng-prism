export interface BoxSides {
  top: number;
  right: number;
  bottom: number;
  left: number;
}

export interface BoxModelData {
  element: Element;
  content: DOMRect;
  padding: BoxSides;
  border: BoxSides;
  margin: BoxSides;
}
