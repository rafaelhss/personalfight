const currentTrainningName = 'currentTrainning';
const bucketName = 'mydrills';


var AWS = require('aws-sdk');
AWS.config.update({region: 'us-west-2'});
s3 = new AWS.S3({apiVersion: '2006-03-01'});


const express = require('express');
const { ExpressAdapter } = require('ask-sdk-express-adapter');
const Alexa = require('ask-sdk-core');

const app = express();




const LaunchRequestHandler = {
  canHandle(handlerInput) {
    return handlerInput.requestEnvelope.request.type === 'LaunchRequest';
  },
  handle(handlerInput) {
    const speechText = "<speak>Welcome to black belt. We have easy, normal and hard boxing and kickboxin trainings. What do you want to train?</speak>";

    return handlerInput.responseBuilder
      .speak(speechText)
      .getResponse();
  }
};


const ChoseTrainningIntentHandler = {
  canHandle(handlerInput) {
    return handlerInput.requestEnvelope.request.type === 'IntentRequest'
      && handlerInput.requestEnvelope.request.intent.name === 'ChoseTrainningIntent';
  },
  async handle(handlerInput) {
    const type = handlerInput.requestEnvelope.request.intent.slots.type.value;
    const level = handlerInput.requestEnvelope.request.intent.slots.level.value;
      
    const speechText = await choseTrainningIntent(level, type);
    console.log("speechText: " + speechText)  
    return handlerInput.responseBuilder
      .speak(speechText)
      .getResponse();
  }
};

const NextDrillIntentHandler = {
  canHandle(handlerInput) {
    return handlerInput.requestEnvelope.request.type === 'IntentRequest'
      && handlerInput.requestEnvelope.request.intent.name === 'NextDrillIntent';
  },
  async handle(handlerInput) {
    
    const speechText =  await nextDrillIntentIntent();
    return handlerInput.responseBuilder
      .speak(speechText)
      .getResponse();
  }
};

const HelpIntentHandler = {
  canHandle(handlerInput) {
    return handlerInput.requestEnvelope.request.type === 'IntentRequest'
      && handlerInput.requestEnvelope.request.intent.name === 'AMAZON.HelpIntent';
  },
  handle(handlerInput) {
    const speechText = 'Chose a type and level of training. for example: I want to train boxing hard.';

    return handlerInput.responseBuilder
      .speak(speechText)
      .reprompt(speechText)
      .getResponse();
  }
};

const CancelAndStopIntentHandler = {
  canHandle(handlerInput) {
    return handlerInput.requestEnvelope.request.type === 'IntentRequest'
      && (handlerInput.requestEnvelope.request.intent.name === 'AMAZON.CancelIntent'
        || handlerInput.requestEnvelope.request.intent.name === 'AMAZON.StopIntent');
  },
  handle(handlerInput) {
    const speechText = 'Goodbye!';

    return handlerInput.responseBuilder
      .speak(speechText)
      .withShouldEndSession(true)
      .getResponse();
  }
};

const SessionEndedRequestHandler = {
  canHandle(handlerInput) {
    return handlerInput.requestEnvelope.request.type === 'SessionEndedRequest';
  },
  handle(handlerInput) {
    //any cleanup logic goes here
    return handlerInput.responseBuilder.getResponse();
  }
};

const ErrorHandler = {
  canHandle() {
    return true;
  },
  handle(handlerInput, error) {
    console.log(`Error handled: ${error.message}`);

    return handlerInput.responseBuilder
      .speak('Sorry, I can\'t understand the command. Please say again.')
      .reprompt('Sorry, I can\'t understand the command. Please say again.')
      .getResponse();
  },
};


function saveSessionTrainning(currentTrainning){
    var uploadParams = {Bucket: bucketName, Key: currentTrainningName, Body: JSON.stringify(currentTrainning)};
    s3.upload (uploadParams, function (err, data) {
      if (err) {
        console.log("Error", err);
      } if (data) {
        console.log("Upload Success", data.Location);
      }
    });
}


function speakDrills(currentTrainning, n) {
    var resp = "";
    for(var i = 0; i <= n; i++){
        resp += currentTrainning.trainning.drill[i].moves;
        if(i < n){
            resp += ". then ";  
        }
    }
    return resp;
}

function nextDrillIntentIntent(){
    return new Promise(((resolve, reject) => {
        var resptxt = "";
        var bucketParams = {
            Bucket : bucketName,
            Key: currentTrainningName
        };
        s3.getObject(bucketParams, function(err, data) {
            if (err) {
                console.log(err, err.stack); // an error occurred
                reject(err);
            } else {
                var currentTrainning = JSON.parse(data.Body.toString('utf-8'));
                currentTrainning.currentdrill += 1;
                saveSessionTrainning(currentTrainning);

                if(currentTrainning.currentdrill >= currentTrainning.trainning.drill.length){
                    resptxt = "<speak> Congratulations! Trainning session is over. you are done! </speak>";
                } else {
                    resptxt = "<speak>Ok! Part " + (currentTrainning.currentdrill + 1) + ". Lets add more moves to that drill. In the end of the drill add: "
                    + currentTrainning.trainning.drill[currentTrainning.currentdrill].moves
                    + " <break time=\"1s\"/>"
                    + ". So, the full drill now is: ";

                    resptxt += speakDrills(currentTrainning, currentTrainning.currentdrill);

                    resptxt += " <break time=\"1s\"/>"
                    + ". I will say it one more time: "

                    resptxt += speakDrills(currentTrainning, currentTrainning.currentdrill);

                    resptxt += " <break time=\"1s\"/> 3, " 
                                                        + " <break time=\"1s\"/> 2, " 
                                                        + " <break time=\"1s\"/> 1, GO!</speak>";   

                    console.log("resptxt: " + resptxt)
                } 
            }
            resolve(resptxt);
        });
    }));
}


function choseTrainningIntent(level, type){
    
    function checkLevel(trainning, level){
        var count = 0;
        trainning.drill.forEach(function(item){
            count += item.moves.split(",").length;
        })

        var mylevel = "";
        if(count < 10 && level == "easy"){
            mylevel = "easy";
        } else if(count < 20){
            mylevel = "normal"
        } else {
            mylevel = "hard";
        }

        return mylevel == level;
    }

    function checkType(trainning, type){
        var mytype = "boxing";
        trainning.drill.forEach(function(item){
            if(item.moves.indexOf("kick") > 0){
                mytype = "kickboxing";   
            }
        })
        return mytype == type ;
    }
    
    //var resp = getResp();
    return new Promise(((resolve, reject) => {
        var resptxt = "";

        var bucketParams = {
            Bucket : 'mydrills',
            Key: 'drills'
        };
        s3.getObject(bucketParams, function(err, data) {
            if (err){
                console.log(err, err.stack); // an error occurred
                reject(err);
            } else {
                var trainnings = JSON.parse(data.Body.toString('utf-8'));           // successful response
                console.log(data.Body.toString('utf-8'));
                var filteredtrainnings = trainnings.filter(function(trainning){
                    return checkLevel(trainning, level) && checkType(trainning, type)
                });
                console.log(filteredtrainnings);

                var currentTrainning = {}
                var chosen = Math.floor(Math.random() * filteredtrainnings.length);
                console.log("chosen: " + chosen);
                currentTrainning.trainning = filteredtrainnings[chosen]
                currentTrainning.currentdrill = 0;

                saveSessionTrainning(currentTrainning);

                console.log(currentTrainning);

                console.log(currentTrainning.trainning.drill[0].moves);
                resptxt = "<speak> All right! lets start. Full drill will be: "; 

                    resptxt += speakDrills(currentTrainning, currentTrainning.trainning.drill.length-1);
                    resptxt += " <break time=\"1s\"/>"
                    + " Lets begin with the first drill: "
                    + currentTrainning.trainning.drill[0].moves 
                    + " <break time=\"2s\"/> again: "
                    + currentTrainning.trainning.drill[0].moves 
                    + ". Shell we begin the drill? </speak>";
                resolve(resptxt);
            }
        });
    }));
}


const skillBuilder = Alexa.SkillBuilders.custom();
const skill = skillBuilder.create();

exports.handler = Alexa.SkillBuilders.custom()
  .addRequestHandlers(
    LaunchRequestHandler,
    ChoseTrainningIntentHandler,
    NextDrillIntentHandler,
    HelpIntentHandler,
    CancelAndStopIntentHandler,
    SessionEndedRequestHandler)
  .addErrorHandlers(ErrorHandler)
  .create();

const adapter = new ExpressAdapter(exports.handler, true, true);


app.post('/', adapter.getRequestHandlers());
//node app.listen(3000);

app.set('port', (process.env.PORT || 5000));


app.listen(app.get('port'), function () {
  console.log('Servidor iniciado na porta ' + app.get('port'));
});



