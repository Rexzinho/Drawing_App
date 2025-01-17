// 4 - UNDO REDO

import rough from 'roughjs/bundled/rough.esm';
import { useState, useLayoutEffect, useEffect } from 'react';

const generator = rough.generator();

function createElement(id, x1, y1, x2, y2, type){

  const roughElement = type === "line" ? 
    generator.line(x1, y1, x2, y2):
    generator.rectangle(x1, y1, x2-x1, y2-y1)

  return { id, x1, y1, x2, y2, type, roughElement}
}

const nearPosition = (x, y, x1, y1, name) => {

  return Math.abs(x - x1) < 5 && Math.abs(y - y1) < 5 ? name : null;
}

const positionWidthinElement = (x, y, element) => {
  
  // esta função retorna onde o mouse está clicando em um elemento, seja no canto superior direito
  // ou no centro dele.
  // também serve para verificar se o mouse de fato está tocando em algum elemento, pois caso ele
  // não atenda a nenhuma das condições, será retornado null

  const{ type, x1, x2, y1, y2 } = element;

  if(type === "rectangle"){
    // funções para descobrir perto de qual canto o mouse está tocando
    // faz isso usando as coordenadas do mouse (x, y) e as coordenadas do elemento (x1, x2, y1, y2)
    // a constante inside verifica se o mouse está tocando dentro do elemento e não nos cantos
    const topLeft = nearPosition(x, y, x1, y1, "tl");
    const topRight = nearPosition(x, y, x2, y1, "tr");
    const bottomLeft = nearPosition(x, y, x1, y2, "bl");
    const bottomRight = nearPosition(x, y, x2, y2, "br");
    const inside = x >= x1 && x <= x2 && y >= y1 && y <= y2 ? "inside" : null;
    return topLeft || topRight || bottomLeft || bottomRight || inside;
  }
  else{
    const a = { x: x1, y: y1};
    const b = { x: x2, y: y2};
    const c = { x, y };
    const offset = distance(a, b) - (distance(a, c) + distance(b, c));
    const start = nearPosition(x, y, x1, y1, "start");
    const end = nearPosition(x, y, x2, y2, "end");
    const inside =  Math.abs(offset) < 1 ? "inside" : null;
    return start || end || inside
  }
}

const distance = (a, b) => Math.sqrt(Math.pow(a.x - b.x, 2) + Math.pow(a.y - b.y, 2));

const getElementAtPosition = (x, y, elements) => {

  // para cada elemento ele encontra o primeiro que bate com as condições da função
  return elements
    .map(element => ({...element, position: positionWidthinElement(x, y, element)}))
    .find(element => element.position !== null);
}

const adjustElementCoordinates = element => {
  const { type, x1, y1, x2, y2 } = element;
  if(type === "rectangle"){
    const minX = Math.min(x1, x2);
    const maxX = Math.max(x1, x2);
    const minY = Math.min(y1, y2);
    const maxY = Math.max(y1, y2);
    return {x1: minX, y1: minY, x2: maxX, y2: maxY}
  }
  else{
    if(x1 < x2 || (x1 === x2 && y1 < y2)){
      return {x1, y1, x2, y2}
    }
    else{
      return {x1: x2, y1: y2, x2: x1, y2: y1}
    }
  }
 }

const cursorForPosition = (position) => {
    switch(position){
      case "tl":
      case "br":
      case "start":
      case "end":
        return "nwse-resize";
      case "tr":
      case "bl":
        return "nesw-resize";
      default:
        return "move";
    }
 }

const  resizeCoordinates = (clientX, clientY, position, coordinates) => {
    const {x1, y1, x2, y2} = coordinates;
    switch (position) {
        case "tl":
        case "start":
        // como é para aumentar o elemento para a esquerda e para cima, o x2 e y2 continuam iguais, mas o x1 e y1 vão receber a informação de onde o mouse se encontra.
        return {x1: clientX, y1: clientY, x2, y2}
        case "tr":
        return {x1, y1: clientY, x2: clientX, y2}
        case "bl":
        return {x1: clientX, y1, x2, y2: clientY}
        case "br":
        case "end":
        return {x1, y1, x2: clientX, y2: clientY}
        default:
        return null;
        
    }
}

const useHistory = (initialState) => {

    const [index, setIndex] = useState(0);
    const [history, setHistory] = useState([initialState]);

    const setState = (action, overwrite = false) => {
        const newState = typeof action === "function" ? action(history[index]) : action;
        if(overwrite){
            const historyCopy = [...history];
            historyCopy[index] = newState;
            setHistory(historyCopy);
        }
        else{
            const updatedState = [...history].slice(0, index + 1);
            setHistory([...updatedState, newState]);
            setIndex(prevState => prevState + 1);
        }
    }

    const undo = () => index > 0 && setIndex(prevState => prevState - 1);
    const redo = () => index < history.length - 1 && setIndex(prevState => prevState + 1);

    return [history[index], setState, undo, redo];
}

function App4() {

const [elements, setElements, undo, redo] = useHistory([]);
  const [action, setAction] = useState("none");
  const [tool, setTool] = useState("line");
  const [selectedElement, setSelectedElement] = useState(null);

  useLayoutEffect(() => {
    const canvas = document.getElementById("canvas");
    const context = canvas.getContext("2d");
    context.clearRect(0, 0, canvas.width, canvas.height);

    const roughCanvas = rough.canvas(canvas);
    
    elements.forEach(({ roughElement }) => roughCanvas.draw(roughElement));

  }, [elements]);

  useEffect(() => {
    const undoRedoFunction = e => {
        if((e.metaKey || e.ctrlKey) && e.key === "z"){
            if(e.shiftKey){
                redo();
            }
            else{
                undo();
            }
        }
    }

    document.addEventListener("keydown", undoRedoFunction);
    return () => {
        document.removeEventListener("keydown", undoRedoFunction);
    }

  }, []);

  const updateElement = (id, x1, y1, x2, y2, type) => {
    // esta função cria um elemento novo nas posições informadas e substitui ele pelo elemento que 
    // se deseja atualizar
    const updatedElement = createElement(id, x1, y1, x2, y2, type);
  
    const elementsCopy = [...elements];
    elementsCopy[id] = updatedElement;
    setElements(elementsCopy, true);
  }

  const handleMouseDown = (e) => {

    const { clientX, clientY } = e;

    if(tool === "selection"){
      const element = getElementAtPosition(clientX, clientY, elements);
      if(element){

        const offsetX = clientX - element.x1;
        const offsetY = clientY - element.y1;
        setSelectedElement({...element, offsetX, offsetY});
        setElements(prevState => prevState);

        if(element.position === "inside"){
          setAction("moving");
        }
        else{
          setAction("resizing");
        }

      }
    } 
    else {
      const id = elements.length;
      const element = createElement(id, clientX, clientY, clientX, clientY, tool);
      setElements(prevState => [...prevState, element]);
      setSelectedElement(element);
      setAction("drawing");
    }
  }

  const handleMouseMove = (e) => {

    const {clientX, clientY} = e;

    // if para mudar a aparência do mouse na seleção
    if(tool === "selection") {
      const element = getElementAtPosition(clientX, clientY, elements)
      e.target.style.cursor = element 
        ? cursorForPosition(element.position)
        : "default";
    }
    
    if(action === "drawing"){
      const index = elements.length - 1;
      const {x1, y1} = elements[index];
      updateElement(index, x1, y1, clientX, clientY, tool);
    }
    else if(action === "moving"){
      const {id, x1, x2, y1, y2, type, offsetX, offsetY} = selectedElement;
      const width = x2 - x1;
      const height = y2 - y1;
      const newX1 = clientX - offsetX;
      const newY1 = clientY - offsetY;
      updateElement(id, newX1, newY1, newX1 + width, newY1 + height, type);
    }
    else if(action === "resizing"){
      const {id, type, position, ...coordinates} = selectedElement;
      const {x1, y1, x2, y2} = resizeCoordinates(clientX, clientY, position, coordinates);
      // recebe as informações de onde o elemento está sendo aumentado
      updateElement(id, x1, y1, x2, y2, type);
      // aumenta o elemento no canvas atualizando ele
    }
    
  }

  const handleMouseUp = (e) => {

    if(selectedElement){
        const index = selectedElement.id;
        const {id, type} = elements[index];
    
        if(action === "drawing" || action === "resizing"){
          const {x1, y1, x2, y2} = adjustElementCoordinates(elements[index]);
          updateElement(id, x1, y1, x2, y2, type);
        }
    }
    setAction("none");
    setSelectedElement(null);
  }

  const saveCanvas = (e) => {
    e.preventDefault();
    const canvas = document.getElementById("canvas");
    canvas.toBlob((blob) => {
      const a = document.createElement("a");
      document.body.append(a);
      a.download = "canvas.png";
      a.href = URL.createObjectURL(blob);
      a.click();
      a.remove();
    })
  }

  return (
    <div>
      <div style={{ position: "fixed" }}>
        <input
          type="radio"
          id="selection"
          checked={tool === "selection"}
          onChange={() => setTool("selection")}
        />
        <label htmlFor="selection">Selection</label>
        <input
          type="radio"
          id="line"
          checked={tool === "line"}
          onChange={() => setTool("line")}
        />
        <label htmlFor="line">Line</label>
        <input 
          type="radio" 
          id="rectangle"
          checked={tool === "rectangle"}
          onChange={() => setTool("rectangle")}
        />
        <label htmlFor="rectangle">Rectangle</label>
        <button onClick={(e) => saveCanvas(e)}>
          Save
        </button>
        <button onClick={() => console.log(elements)}>Elements</button>
      </div>
      <div style={{ position: "fixed", bottom: 0, padding: 10}}>
        <button onClick={undo}>Undo</button>
        <button onClick={redo}>Redo</button>
      </div>
      <canvas 
        id="canvas" 
        width={window.innerWidth} 
        height={window.innerHeight}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
      >
        Canvas
      </canvas>
    </div>
  )
}

export default App4;
