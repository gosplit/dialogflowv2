[![NPM](https://nodei.co/npm/node-red-contrib-dialogflowv2-api.png?downloads=true&downloadRank=true&stars=true)](https://nodei.co/npm/node-red-contrib-dialogflowv2-api/)

[![npm](https://img.shields.io/npm/dt/node-red-contrib-dialogflowv2-api.svg)](https://www.npmjs.com/package/node-red-contrib-dialogflowv2-api)

# README #
Dialogflow node for Node-RED. Uses new version API V2.
Receives a text request for input. As a result, we get the full response from Dialogflow API.

The code for the node was forked and slightly simplified. Thank you very much [guidone](https://github.com/guidone "guidone") for [RedBot](https://github.com/guidone/node-red-contrib-chatbot "RedBot")

### Install ###

Install latest release: `npm i -g node-red-contrib-dialogflowv2-api`

### Action modes
  - `detectIntent`
    requst for NLP
  - `batchUpdateEntities`
    request to update entity on Dialogflow.com

### Inputs

  `msg.payload` *string* or *array*
   - requires to be a *string* in `detectIntent` mode, contains the text of our request for NLP. 
    for example, *"May I have a cup of coffee today?"*
   - requires to be an *array* in `batchUpdateEntities` mode, contains the array of entities. 
    for example, `[{ value: "kitty", synonyms: [ "kitty", "small cat" ]}, { value: "puppy", synonyms: [ "puppy", "small dog" ]}]`

### Outputs

`msg._dialogflow ` *Object*

Result. Object from Dialogflow API response for our text request.

### Details

`msg.payload` Not affected or processed. The output remains the same.