"use strict";
import React from "react";
import { FlatList, Text } from 'react-native';
const DATA = require("./emoji.json");
const DATA_LENGTH = DATA.length;

class Emoji extends React.PureComponent {
  render() {
    return <Text style={{ fontFamily: "NotoColorEmoji", fontSize: 28, flex: 1, padding: 3}}>{this.props.item.base}</Text>;
  }
}

const EmojiSelector = function({style, onLoaded}) {
  let is_loaded = false;
  const render = function({item, index}) {
    if (index === (DATA_LENGTH-1)) {
      if (!is_loaded) {
        is_loaded = true;
        onLoaded && onLoaded();
      }
    }
    return <Emoji item={item} />;
  };
  
  return (
    <FlatList
      style={style}
      data={DATA}
      numColumns={8}
      renderItem={render}
      keyExtractor={(item, index) => item.base + index}
      removeClippedSubviews={true}
    />
  );
};

export default EmojiSelector;