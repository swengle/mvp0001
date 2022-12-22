"use strict";
import _ from "underscore";
import { Chip, Text, useTheme } from "react-native-paper";
import TouchableOpacity from "../components/TouchableOpacity";

const ROW_HEIGHT = 60;

const EmojiSearchResult = function({on_press, emoji, navigation}) {
const { colors } = useTheme();
  
  if (!emoji) {
    return;
  }
  
  const local_on_press = function() {
    if (_.isFunction(on_press)) {
      on_press(emoji);
      return;
    }
    navigation.push("UserPostListScreen", {screen: "EmojiScreen", emoji: emoji.char});
  };
  
  let now = Date.now();
  const keywords = [];
  _.each(emoji.keywords, function(keyword, keyword_index) {
    if (emoji.parts_by_keyword[keyword]) {
      const parts = [];
      _.each(emoji.parts_by_keyword[keyword].parts, function(part, part_index) {
        parts.push(<Text key={++now} style={{color: part_index === emoji.parts_by_keyword[keyword].part_index ? colors.primary : undefined, fontWeight: part_index === emoji.parts_by_keyword[keyword].part_index ? "bold" : undefined}}>{part}</Text>);
      });
      keywords.push(<Chip key={++now} style={{marginLeft: 10}} mode="outlined">{parts}</Chip>);
    }
  });
  
  return (
    <TouchableOpacity style={{flex:1, flexDirection: "row", alignItems: "center", height: ROW_HEIGHT, marginLeft: 10}} onPress={local_on_press}>
      <Text onPress={on_press} style={{ fontFamily: "TwemojiMozilla", fontSize: 40, width: 40}}>{emoji.char}</Text>
      {keywords}
    </TouchableOpacity>
  );
};


export default EmojiSearchResult;