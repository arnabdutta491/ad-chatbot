import {useState} from 'react';
import axios from "axios";
import PromptInput from "../PromptInput/PromptInput";
import './App.css';
import {ResponseInterface} from "../PromptResponseList/response-interface";
import PromptResponseList from "../PromptResponseList/PromptResponseList";

type ModelValueType = '1' | 'gpt-3.5-turbo' | '2';
const App = () => {

  const [responseList, setResponseList] = useState<ResponseInterface[]>([]);
  const [prompt, setPrompt] = useState<string>('');
  const [promptToRetry, setPromptToRetry] = useState<string | null>(null);
  const [uniqueIdToRetry, setUniqueIdToRetry] = useState<string | null>(null);
  const [modelValue] = useState<ModelValueType>('1');
  // const [modelValue, setModelValue] = useState<ModelValueType>('1');
  const [isLoading, setIsLoading] = useState(false);
  let loadInterval: number | undefined;

  const generateUniqueId = () => {
    const timestamp = Date.now();
    const randomNumber = Math.random();
    const hexadecimalString = randomNumber.toString(16);

    return `id-${timestamp}-${hexadecimalString}`;
  }

  const htmlToText = (html: string) => {
    const temp = document.createElement('div');
    temp.innerHTML = html;
    return temp.textContent;
  }

  const delay = (ms: number) => {
    return new Promise( resolve => setTimeout(resolve, ms) );
  }

  const addLoader = (uid: string) => {
    const element = document.getElementById(uid) as HTMLElement;
    element.textContent = ''

    // @ts-ignore
    loadInterval = setInterval(() => {
      // Update the text content of the loading indicator
      element.textContent += '.';

      // If the loading indicator has reached three dots, reset it
      if (element.textContent === '....') {
        element.textContent = '';
      }
    }, 300);
  }


  const addResponse = (selfFlag: boolean, response?: string) => {
    const uid = generateUniqueId()
    setResponseList(prevResponses => [
      ...prevResponses,
      {
        id: uid,
        response,
        selfFlag
      },
    ]);
    return uid;
  }

  const updateResponse = (uid: string, updatedObject: Record<string, unknown>) => {
    setResponseList(prevResponses => {
      const updatedList = [...prevResponses]
      const index = prevResponses.findIndex((response) => response.id === uid);
      if (index > -1) {
        updatedList[index] = {
          ...updatedList[index],
          ...updatedObject
        }
      }
      return updatedList;
    });
  }

  const regenerateResponse = async () => {
    await getGPTResult(promptToRetry, uniqueIdToRetry);
  }

  const getGPTResult = async (_promptToRetry?: string | null, _uniqueIdToRetry?: string | null) => {
    // Get the prompt input
    const _prompt = _promptToRetry ?? htmlToText(prompt);

    // If a response is already being generated or the prompt is empty, return
    if (isLoading || !_prompt) {
      return;
    }

    setIsLoading(true);
    setPrompt('');

    let uniqueId: string;
    if (_uniqueIdToRetry) {
      uniqueId = _uniqueIdToRetry;
    } else {
      addResponse(true, _prompt);
      uniqueId = addResponse(false);
      await delay(50);
      addLoader(uniqueId);
    }

    try {
      const options = {
        method: 'POST',
        url: `https://${process.env.REACT_APP_MY_URL}/chat/completions`,
        headers: {
          'content-type': 'application/json',
          'X-RapidAPI-Key': process.env.REACT_APP_X_RapidAPI_Key,
          'X-RapidAPI-Host': process.env.REACT_APP_X_RapidAPI_Host,
          "x-rapidapi-ua": process.env.REACT_APP_X_RapidAPI_UA
        },
        data: JSON.stringify({
          model: "gpt-3.5-turbo",
          messages: [
            {
              role: 'user',
              content:_prompt
            }
          ]
        })
      };    
      const response :any = await axios.request(options);
      console.log(response);
      
	    console.log(response.data['choices'][0]['message']['content']);
      if (modelValue === '2') {
        // Show image for `Create image` model
        updateResponse(uniqueId, {
          image: response.data,
        });
      } else {
        updateResponse(uniqueId, {
          response: response.data['choices'][0]['message']['content'].trim(),
        });
      }

      setPromptToRetry(null);
      setUniqueIdToRetry(null);
    } catch (err) {
      setPromptToRetry(_prompt);
      setUniqueIdToRetry(uniqueId);
      updateResponse(uniqueId, {
        // @ts-ignore
        response: `Error: ${err.message}`,
        error: true
      });
    } finally {
      // Clear the loader interval
      clearInterval(loadInterval);
      setIsLoading(false);
    }
  }


  return (
    <div className="App">
      <div id="response-list">
        <PromptResponseList responseList={responseList} key="response-list"/>
      </div>
      { uniqueIdToRetry &&
        (<div id="regenerate-button-container">
          <button id="regenerate-response-button" className={isLoading ? 'loading' : ''} onClick={() => regenerateResponse()}>
            Regenerate Response
          </button>
        </div>
        )
      }
      {/* <div id="model-select-container">
        <label htmlFor="model-select">Select model:</label>
        <select id="model-select" value={modelValue} onChange={(event) => setModelValue(event.target.value as ModelValueType)}>
          <option value="1">GPT-3 (Understand and generate natural language )</option>
          <option value="gpt-3.5-turbo">Codex (Understand and generate code, including translating natural language to code)
          </option>
          <option value="2">Create Image (Create AI image using DALL·E models)</option>
        </select>
      </div> */}
      <div id="input-container">
        <PromptInput
          prompt={prompt}
          onSubmit={() => getGPTResult()}
          key="prompt-input"
          updatePrompt={(prompt) => setPrompt(prompt)}
        />
        <button id="submit-button" className={isLoading ? 'loading' : ''} onClick={() => getGPTResult()}></button>
      </div>
    </div>
  );
}

export default App;
