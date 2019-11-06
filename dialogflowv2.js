var _ = require('underscore');
var utils = require('./lib/helpers/utils');
var lcd = require('./lib/helpers/lcd');
var dialogflow = require('dialogflow');
var when = utils.when;

module.exports = function (RED) {

  function DialogflowV2(config) {
    RED.nodes.createNode(this, config);
    var node = this;
    node.dialogflow = config.dialogflow;
    node.language = config.language;
    node.debug = config.debug;
    node.action = config.action;
    node.entityname = config.entityname;
    node.merge = config.merge;

    this.on('input', function (msg) {
      const dialogFlowNode = RED.nodes.getNode(node.dialogflow);
      const language = utils.extractValue('string', 'language', node, msg, false);
      const debug = utils.extractValue('boolean', 'debug', node, msg, false);
      const action = utils.extractValue('string', 'action', node, msg, false);
      const entityname = utils.extractValue('string', 'entityname', node, msg, false);
      const merge = utils.extractValue('boolean', 'merge', node, msg, false);

      // exit if empty credentials
      if (dialogFlowNode == null || dialogFlowNode.credentials == null) {
        lcd.warn('Dialogflow.ai credentials are missing.');
        return;
      }
      const projectId = dialogFlowNode.credentials.projectId;
      const credentials = {
        private_key: dialogFlowNode.credentials.privateKey,
        client_email: dialogFlowNode.credentials.email
      };

      if (action == "_batchUpdateEntities_") {
        if (_.isEmpty(entityname)) {
          node.error('Entity Name param is empty in Dialogflow node');
          return;
        }
        const entities = msg.payload;
        if (!_.isArray(entities)) {
          node.error('msg.payload should be an array of Entity entries during batchUpdateEntities');
          return;
        }

        updateEntities(credentials, projectId, entityname, msg.payload, merge, node).then(
          updateResult => {
            msg._dialogflow = updateResult;
            node.send(msg, null);
          }
        ).catch(function (error) {
          if (error != null) {
            node.error(error, msg);
          }
        });
      } else if (action == "_detectIntent_") {
        // error if no language at all
        if (_.isEmpty(language)) {
          node.error('Language param is empty in Dialogflow node');
          return;
        }

        detectIntent(credentials, projectId, String(msg._msgid), msg.payload, language).then(
          queryResult => {
            msg._dialogflow = queryResult;

            if (debug) {
              lcd.node(msg.payload, { node: node, title: 'Dialogflow-V2.com' });
            }
            node.send([msg, null]);
          }).catch(function (error) {
            if (error != null) {
              node.error(error, msg);
            }
          });
      } else {
        node.error('Action is invalid in Dialogflow node');
      }
    });
  }

  async function detectIntent(credentials, projectId, sessionId, text, language) {
    var sessionClient = new dialogflow.SessionsClient({
      credentials: credentials
    });

    var sessionPath = sessionClient.sessionPath(projectId, sessionId);

    return when({
      session: sessionPath,
      queryInput: {
        text: {
          text: text,
          languageCode: language.toLowerCase()
        }
      }
    })
      .then(function (request) {
        return sessionClient.detectIntent(request);
      })
      .then(function (response) {
        if (response == null || !_.isArray(response) || _.isEmpty(response)) {
          return Promise.reject('Error on api.dialogflow.com');
        }
        return response[0].queryResult;
      });
  }

  async function updateEntities(credentials, projectId, entityTypeName, entities, merge, node) {
    // [START dialogflow_create_entity]
    // Imports the Dialogflow library
    // const dialogflow = require('dialogflow');

    // Instantiates clients
    const entityTypesClient = new dialogflow.EntityTypesClient(
      { credentials: credentials }
    );

    // The path to the agent the entity types belong to.
    const projectAgentPath = entityTypesClient.projectAgentPath(projectId);

    // Call the client library to retrieve a list of all existing entity types.
    return entityTypesClient.listEntityTypes({ parent: projectAgentPath })
      .then(response => {
        for (let entityType of response[0]) {
          if (entityType.displayName == entityTypeName || ("@" + entityType.displayName) == entityTypeName) {
            if (node.debug) {
              lcd.node("Found entity type:" + entityType.name, { node: node, title: 'Dialogflow-V2.com' });
            }
            return entityType;
          }
        }
        return Promise.reject("Cannot find entity: " + entityTypeName);
      }).then(entityType => {
        if (merge) {
          return entityType;
        }
        
        const batchDelEntitiesRequest = {
          parent: entityType.name,
          entityValues: entityType.entities.map(ent => ent.value)
        };
        entityType.entities = [];
        return entityTypesClient.batchDeleteEntities(batchDelEntitiesRequest).then(function(deleteResult){
          return entityType;
        });
      }).then(entityType => {
        entities.forEach(entity => {
          if (_.isString(entity)) {
            entity = {
              value: entity
            };
          }
          const index = entityType.entities.findIndex(obj => {
             return obj.value == entity.value || (obj.synonyms 
                && obj.synonyms.some(syn=> syn == entity.value || (entity.synonyms && entity.synonyms.includes(syn))));
            });
          lcd.node(index, { node: node, title: 'Dialogflow-V2.com' });
          if (index >= 0) {
            if (entity.synonyms) {
              entityType.entities[index].synonyms = entityType.entities[index].synonyms.concat(entity.synonyms);
            }
            entityType.entities[index].synonyms.push(entity.value);
          } else {
            entityType.entities.push(entity);
          }
        });

        if (node.debug) {
          lcd.node(entityType.entities, { node: node, title: 'Dialogflow-V2.com' });
        }
        return entityType;
      }).then(entityType => {
        const batchUpdateEntitiesRequest = {
          parent: entityType.name,
          entities: entityType.entities
        };
        return entityTypesClient.batchUpdateEntities(batchUpdateEntitiesRequest);
      });

    // [END dialogflow_create_entity]
  }

  RED.nodes.registerType('dialogflowv2', DialogflowV2);

  function DialogflowV2Token(n) {
    RED.nodes.createNode(this, n);
  }

  RED.nodes.registerType('dialogflowv2-token', DialogflowV2Token, {
    credentials: {
      email: {
        type: 'text'
      },
      privateKey: {
        type: 'text'
      },
      projectId: {
        type: 'text'
      }
    }
  });

};
