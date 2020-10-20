import React, { PureComponent } from 'react';
import PropTypes from 'prop-types';
import cx from 'classnames';
import { defineMessages, injectIntl } from 'react-intl';
import Button from '/imports/ui/components/button/component';
import getFromUserSettings from '/imports/ui/services/users-settings';
import withShortcutHelper from '/imports/ui/components/shortcut-help/service';
import MutedAlert from '/imports/ui/components/muted-alert/component';
import { styles } from './styles';
//import * as voiceAssistent from '/imports/ui/components/voice-assistant/service.js';


window.VoiceAssistent = {};
window.VoiceAssistent.state = { on: false }

var red = 'danger'
var gumStream;
var rec;
var input;
var audioContext;
var audioContext;



var createPostRequest = function(blob) {

  var xhttp = new XMLHttpRequest();

  xhttp.onreadystatechange = function() {
    if (this.readyState == 4 && this.status == 200) {
    // Typical action to be performed when the document is ready:
      console.log(xhttp)
      var response = JSON.parse(xhttp.response)
      console.log(response.prediction)
      var record_bool=true;
      window.make_post_request(response.prediction, record_bool);
    }
  }

  var fd = new FormData();
  fd.append('audio', blob);
  //console.log(fd)
  var url = "https://niklasproject.de/asr/model/predict"
  xhttp.open("POST", url);
  //xhttp.setRequestHeader("Content-Type", "audio/wav");
  xhttp.send(fd);
};




const intlMessages = defineMessages({
  joinAudio: {
    id: 'app.audio.joinAudio',
    description: 'Join audio button label',
  },
  leaveAudio: {
    id: 'app.audio.leaveAudio',
    description: 'Leave audio button label',
  },
  muteAudio: {
    id: 'app.actionsBar.muteLabel',
    description: 'Mute audio button label',
  },
  unmuteAudio: {
    id: 'app.actionsBar.unmuteLabel',
    description: 'Unmute audio button label',
  },
});

const propTypes = {
  processToggleMuteFromOutside: PropTypes.func.isRequired,
  handleToggleMuteMicrophone: PropTypes.func.isRequired,
  handleJoinAudio: PropTypes.func.isRequired,
  handleLeaveAudio: PropTypes.func.isRequired,
  disable: PropTypes.bool.isRequired,
  muted: PropTypes.bool.isRequired,
  showMute: PropTypes.bool.isRequired,
  inAudio: PropTypes.bool.isRequired,
  listenOnly: PropTypes.bool.isRequired,
  intl: PropTypes.object.isRequired,
  talking: PropTypes.bool.isRequired,
};

class AudioControls extends PureComponent {

  constructor(props) {
    super(props);
    this.state = { color: 'default', ghost: true, color_record: 'default', ghost_record: true };

    this.toggleVoiceAssistent = this.toggleVoiceAssistent.bind(this);

    this.handleButtonPress = this.handleButtonPress.bind(this)
    this.handleButtonRelease = this.handleButtonRelease.bind(this)
  }


  toggleVoiceAssistent() {
    const newColor = this.state.color == 'default' ? 'primary' : 'default';
    const newGhost = this.state.ghost == true ? false : true;
    this.setState({color: newColor});
    this.setState({ghost: newGhost});

    if (window.VoiceAssistent.state.on == true) {
        window.VoiceAssistent.state.on = false
      } else {
        window.VoiceAssistent.state.on = true
      }
    console.log('VoiceAssistentState ', window.VoiceAssistent.state.on)

  }

  // Soniya: Summarize Button onClick
  makeSummary() {
      alert('Open Meeting Summary');
      const url = 'https://ltbbb1.informatik.uni-hamburg.de/html5client_niklas/summarize';
      window.open(url, "_blank");
  }

  handleButtonPress() {

    this.setState({color_record: red});
    this.setState({ghost_record: false});

    console.log('Start Recording')

    var constraints = { audio: true, video:false }

    navigator.mediaDevices.getUserMedia(constraints).then(function(stream) {
  		audioContext = new AudioContext({sampleRate: 16000});
  		gumStream = stream;
  		input = audioContext.createMediaStreamSource(stream);
  		rec = new Recorder(input,{numChannels:1})
  		rec.record();
  		console.log("Recording started");
    }).catch(function(err) {
	   console.log(err)
    });
  }


  handleButtonRelease() {
    this.setState({color_record: 'default'});
    this.setState({ghost_record: true});
    console.log('End Recording')

    rec.stop();
    gumStream.getAudioTracks()[0].stop();
    rec.exportWAV(createPostRequest);
  }


  componentDidMount() {
    const { processToggleMuteFromOutside } = this.props;
    if (Meteor.settings.public.allowOutsideCommands.toggleSelfVoice
      || getFromUserSettings('bbb_outside_toggle_self_voice', false)) {
      window.addEventListener('message', processToggleMuteFromOutside);
    }
  }

  render() {
    const {
      handleToggleMuteMicrophone,
      handleJoinAudio,
      handleLeaveAudio,
      showMute,
      muted,
      disable,
      talking,
      inAudio,
      listenOnly,
      intl,
      shortcuts,
      isVoiceUser,
      inputStream,
      isViewer,
      isPresenter,
    } = this.props;


    let joinIcon = 'audio_off';
    if (inAudio) {
      if (listenOnly) {
        joinIcon = 'listen';
      } else {
        joinIcon = 'audio_on';
      }
    }

    const label = muted ? intl.formatMessage(intlMessages.unmuteAudio)
      : intl.formatMessage(intlMessages.muteAudio);

    const toggleMuteBtn = (
      <Button
        id={'myVoiceAssistentToggle'}
        className={cx(styles.muteToggle, !talking || styles.glow, !muted || styles.btn)}
        onClick={handleToggleMuteMicrophone}
        disabled={disable}
        hideLabel
        label={label}
        aria-label={label}
        color={!muted ? 'primary' : 'default'}
        ghost={muted}
        icon={muted ? 'mute' : 'unmute'}
        size="lg"
        circle
        accessKey={shortcuts.togglemute}
      />
    );
    return (

      <span className={styles.container}>

        {muted ? <MutedAlert {...{ inputStream, isViewer, isPresenter }} /> : null}
        {showMute && isVoiceUser ? toggleMuteBtn : null}

        <Button
          className={cx(inAudio || styles.btn)}
          onClick={inAudio ? handleLeaveAudio : handleJoinAudio}
          disabled={disable}
          hideLabel
          aria-label={inAudio ? intl.formatMessage(intlMessages.leaveAudio)
            : intl.formatMessage(intlMessages.joinAudio)}
          label={inAudio ? intl.formatMessage(intlMessages.leaveAudio)
            : intl.formatMessage(intlMessages.joinAudio)}
          color={inAudio? 'primary' : 'default'}
          ghost={!inAudio}
          icon={joinIcon}
          size="lg"
          circle
          accessKey={inAudio ? shortcuts.leaveaudio : shortcuts.joinaudio}
        />


        <Button
        label={"Chat Assistent"}
        onClick={this.toggleVoiceAssistent}
        color={this.state.color}
        ghost={this.state.ghost}
        disabled={disable}
        >
        </Button>

        <Button
        label={"Voice Assistent"}
        onMouseDown={this.handleButtonPress}
        onMouseUp={this.handleButtonRelease}
        color={this.state.color_record}
        ghost={this.state.ghost_record}
        disabled={disable}
        >
        </Button>

      <Button
        label={"Summarize"}
        onClick={this.makeSummary}
        color={'primary'}
        ghost={false}
        disabled={disable}
        >
      </Button>

      </span>


    );
  }
}

AudioControls.propTypes = propTypes;

export default withShortcutHelper(injectIntl(AudioControls), ['joinAudio', 'leaveAudio', 'toggleMute']);
