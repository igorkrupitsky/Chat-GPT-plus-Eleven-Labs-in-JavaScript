var OPENAI_API_KEY = "";
var ELEVEN_LABS_API_KEY = "";
var sVoiceId = "21m00Tcm4TlvDq8ikWAM"; //Rachel
var bSpeechInProgress = false;
var oSpeechRecognizer = null

function OnLoad() {

    if ("webkitSpeechRecognition" in window) {
    } else {
        //speech to text not supported
        lblSpeak.style.display = "none";
    }

    GetVoiceList();
}

function ChangeLang(o) {
    if (oSpeechRecognizer) {
        oSpeechRecognizer.lang = selLang.value;
        //SpeechToText()
    }
}

function GetVoiceList() {   

    var oHttp = new XMLHttpRequest();
    oHttp.open("GET", "https://api.elevenlabs.io/v1/voices");
    oHttp.setRequestHeader("Accept", "application/json");
    oHttp.setRequestHeader("Content-Type", "application/json");
    oHttp.setRequestHeader("xi-api-key", ELEVEN_LABS_API_KEY)

    oHttp.onreadystatechange = function () {
        if (oHttp.readyState === 4) {

            var oJson = { voices: []};

            try {
                oJson = JSON.parse(oHttp.responseText);
            } catch (ex) {
                txtOutput.value += "Error: " + ex.message
            }

            for (var i = 0; i < oJson.voices.length; i++) {
                selVoices.options[selVoices.length] = new Option(oJson.voices[i].name, oJson.voices[i].voice_id);
            };
        }
    };

    oHttp.send();
}

function SayIt() {
    var s = txtMsg.value;
    if (s == "") {
        txtMsg.focus();
        return;
    }

    TextToSpeech(s);
}

function TextToSpeech(s) {
    if (chkMute.checked) return;

    if (selVoices.length > 0 && selVoices.selectedIndex != -1) {
        sVoiceId = selVoices.value;
    }

    spMsg.innerHTML = "Eleven labs text-to-speech...";

    var oHttp = new XMLHttpRequest();
    oHttp.open("POST", "https://api.elevenlabs.io/v1/text-to-speech/" + sVoiceId);
    oHttp.setRequestHeader("Accept", "audio/mpeg");
    oHttp.setRequestHeader("Content-Type", "application/json");
    oHttp.setRequestHeader("xi-api-key", ELEVEN_LABS_API_KEY)

    oHttp.onload = function () {
        if (oHttp.readyState === 4) {

            spMsg.innerHTML = "";

            var oBlob = new Blob([this.response], { "type": "audio/mpeg" });
            var audioURL = window.URL.createObjectURL(oBlob);
            var audio = new Audio();
            audio.src = audioURL;
            audio.play();
        }
    };

    var data = {
        text: s,
        voice_settings: { stability: 0, similarity_boost: 0 }
    };

    oHttp.responseType = "arraybuffer";
    oHttp.send(JSON.stringify(data));
}

function SetModels() {
    selModel.length = 0;

    var oHttp = new XMLHttpRequest();
    oHttp.open("GET", "https://api.openai.com/v1/models");
    oHttp.setRequestHeader("Accept", "application/json");
    oHttp.setRequestHeader("Content-Type", "application/json");
    oHttp.setRequestHeader("Authorization", "Bearer " + OPENAI_API_KEY);

    oHttp.onreadystatechange = function () {
        if (oHttp.readyState === 4) {

            var oJson = { voices: [] };

            try {
                oJson = JSON.parse(oHttp.responseText);
            } catch (ex) {
                txtOutput.value += "Error: " + ex.message
            }

            var l = [];

            for (var i = 0; i < oJson.data.length; i++) {
                l.push(oJson.data[i].id);                
            };

            l.sort();

            for (var i = 0; i < l.length; i++) {
                selModel.options[selModel.length] = new Option(l[i], l[i]);
            };

            for (var i = 0; i < selModel.length; i++) {
                if (selModel.options[i].value == "text-davinci-003") {
                    selModel.selectedIndex = i;
                    break;
                }
            };
        }
    };

    oHttp.send();
}

function Send() {

    var sQuestion = txtMsg.value;
    if (sQuestion == "") {
        alert("Type in your question!");
        txtMsg.focus();
        return;
    }

    spMsg.innerHTML = "Chat GPT is thinking...";

    var sUrl = "https://api.openai.com/v1/completions";
    var sModel = selModel.value;// "text-davinci-003";
    if (sModel.indexOf("gpt-3.5-turbo") != -1) {
        //https://openai.com/research/gpt-4
        sUrl = "https://api.openai.com/v1/chat/completions";
    }

    var oHttp = new XMLHttpRequest();
    oHttp.open("POST", sUrl);
    oHttp.setRequestHeader("Accept", "application/json");
    oHttp.setRequestHeader("Content-Type", "application/json");
    oHttp.setRequestHeader("Authorization", "Bearer " + OPENAI_API_KEY)

    oHttp.onreadystatechange = function () {
        if (oHttp.readyState === 4) {
            //console.log(oHttp.status);

            spMsg.innerHTML = "";

            var oJson = {}
            if (txtOutput.value != "") txtOutput.value += "\n";

            try {
                oJson = JSON.parse(oHttp.responseText);
            } catch (ex) {
                txtOutput.value += "Error: " + ex.message
            }

            if (oJson.error && oJson.error.message) {
                txtOutput.value += "Error: " + oJson.error.message;

            } else if (oJson.choices) {
                var s = "";

                if (oJson.choices[0].text) {
                    s = oJson.choices[0].text;

                } else if (oJson.choices[0].message) {
                    //GPT-4
                    s = oJson.choices[0].message.content;
                }                

                if (selLang.value != "en-US") {
                    var a = s.split("?\n");
                    if (a.length == 2) {
                        s = a[1];
                    }
                }

                if (s == "") {
                    s = "No response";
                } else {
                    txtOutput.value += "Chat GPT: " + s;
                    TextToSpeech(s);
                }
            }            
        }
    };

    var iMaxTokens = 2048;
    var sUserId = "1";
    var dTemperature = 0.5;    

    var data = {
        model: sModel,
        prompt: sQuestion,
        max_tokens: iMaxTokens,
        user: sUserId,
        temperature:  dTemperature,
        frequency_penalty: 0.0, //Number between -2.0 and 2.0  Positive value decrease the model's likelihood to repeat the same line verbatim.
        presence_penalty: 0.0,  //Number between -2.0 and 2.0. Positive values increase the model's likelihood to talk about new topics.
        stop: ["#", ";"] //Up to 4 sequences where the API will stop generating further tokens. The returned text will not contain the stop sequence.
    }

    //chat GPT-4 gpt-4
    if (sModel.indexOf("gpt-3.5-turbo") != -1) {
        data = {
            "model": sModel,
            "messages": [
                //{
                //    "role": "system",
                //    "content": "You are a helpful assistant."  assistant messages help store prior responses
                //},
                {
                    "role": "user", //system,user,assistant
                    "content": sQuestion
                }
            ]
        }
    }

    oHttp.send(JSON.stringify(data));

    if (txtOutput.value != "") txtOutput.value += "\n";
    txtOutput.value += "Me: " + sQuestion;
    txtMsg.value = "";
}

function Mute(b) {
    if (b) {
        selVoices.style.display = "none";
    } else {
        selVoices.style.display = "";
    }
}

function SpeechToText() {

    if (oSpeechRecognizer) {

        if (chkSpeak.checked) {
            oSpeechRecognizer.start();
        } else {
            oSpeechRecognizer.stop();
        }

        return;
    }    

    oSpeechRecognizer = new webkitSpeechRecognition();
    oSpeechRecognizer.continuous = true;
    oSpeechRecognizer.interimResults = true;
    oSpeechRecognizer.lang = selLang.value;
    oSpeechRecognizer.start();

    oSpeechRecognizer.onresult = function (event) {
        var interimTranscripts = "";
        for (var i = event.resultIndex; i < event.results.length; i++) {
            var transcript = event.results[i][0].transcript;

            if (event.results[i].isFinal) {
                txtMsg.value = transcript;
                Send();
            } else {
                transcript.replace("\n", "<br>");
                interimTranscripts += transcript;
            }

            var oDiv = document.getElementById("idText");
            oDiv.innerHTML = '<span style="color: #999;">' + interimTranscripts + '</span>';
        }
    };

    oSpeechRecognizer.onerror = function (event) {

    };
}