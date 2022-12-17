"use strict";
import { Text } from "react-native-paper";
import TouchableOpacity from "../components/TouchableOpacity";

const MARGIN_RIGHT = 10;
const MARGIN_TOP = 10;
const CIRCLE_SIZE = 125;
const EMOJI_SIZE = 80;

const EmojiOverlay = function({ emoji_char, on_press, scaling_factor }) {
  let scaling = scaling_factor || 1;
  const margin_right = MARGIN_RIGHT/scaling;
  const margin_top = MARGIN_TOP/scaling;
  const circle_size = CIRCLE_SIZE/scaling;
  const emoji_size = EMOJI_SIZE/scaling;
  
  const on_press_emoji = function() {
    console.log("WTF");
  };
  

  return (
    <TouchableOpacity onPress={on_press_emoji} style={{position: "absolute", right: margin_right, top: margin_top, width: circle_size, height: circle_size, borderRadius: circle_size/2, borderWidth: 2/scaling, borderColor: "white", backgroundColor: "rgba(0, 0, 0, 0.65)", alignItems: "center", justifyContent: "center"}}>
      <Text style={{ fontFamily: "TwemojiMozilla", fontSize: emoji_size, width: emoji_size}}>{emoji_char}</Text>
    </TouchableOpacity>
  );
};


export default EmojiOverlay;