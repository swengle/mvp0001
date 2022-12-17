"use strict";
import React, { useEffect, useRef, useState}  from "react";
import _ from "underscore";
import { FlatList, Keyboard, KeyboardAvoidingView, Platform, StyleSheet, View} from 'react-native';
import TouchableOpacity  from "../components/TouchableOpacity";
import { IconButton, Searchbar, Surface, Text } from 'react-native-paper';

const DATA = require("./emoji.json");

const SELECT_ICON_SIZE = 16;
const ROW_HEIGHT = 50;

const CATEGORIES = {
  smileys: {name: "Smileys & Emotion", icon: "emoticon"},
  people: {name: "People & Body", icon: "account-multiple"},
  animals: {name: "Animals & Nature", icon: "dog"},
  food: {name: "Food & Drink", icon: "food-apple"},
  travel: {name: "Travel & Places", icon: "car"},
  activities: {name: "Activities", icon: "basketball"},
  objects: {name: "Objects", icon: "tshirt-crew"},
  symbols: {name: "Symbols", icon: "symbol"},
  flags: {name: "Flags", icon: "flag"}
};

const EmojiTypeButton = function({category, onPress, isDisabled}) {
  const on_press = function() {
    onPress(category);
  };
  
  return <IconButton size={SELECT_ICON_SIZE} icon={category.icon} onPress={on_press} style={styles.icon_button} disabled={isDisabled}/>;
};

const EmojiPart = function({emoji_data, onPress}) {
  const on_press = function() {
    onPress(emoji_data);
  };
  
  return (
    <View key={emoji_data.char} style={{height: ROW_HEIGHT, flex: 1/6}}>
      <Text onPress={on_press} style={{ fontFamily: "TwemojiMozilla", fontSize: 40}}>{emoji_data.char}</Text>
    </View>
  );
};

const EmojiSearch = function({emoji_data, onPress}) {
  if (!emoji_data) {
    return;
  }
  
  const on_press = function() {
    onPress(emoji_data);
  };
  
  const parts = [];
  _.each(emoji_data.parts, function(part, index) {
    parts.push(<Text key={index} style={index === emoji_data.part_index ? {fontWeight: "bold"} : null}>{part}</Text>);
  });
  
  return (
    <TouchableOpacity style={{flex:1, flexDirection: "row", alignItems: "center", height: ROW_HEIGHT, marginLeft: 10}} onPress={on_press}>
      <Text onPress={on_press} style={{ fontFamily: "TwemojiMozilla", fontSize: 40, width: 40}}>{emoji_data.char}</Text>
      <Text style={{marginLeft: 8, textAlign: "left"}}>
        {parts}
      </Text>
    </TouchableOpacity>
  );
};

class Emoji extends React.PureComponent {
  constructor(props) {
    super(props);
    this.on_press_emoji = this.on_press_emoji.bind(this);
  }
  
  on_press_emoji(emoji_data) {
    this.props.onPress && this.props.onPress(emoji_data);
  }
  
  render() {
    const me = this;
    if (_.isArray(me.props.item)) {
      const rendered = [];
      _.each(me.props.item, function(emoji_data) {
        rendered.push(<EmojiPart key={emoji_data.char} emoji_data={emoji_data} onPress={me.on_press_emoji}/>);
      });
      return <View style={{flexDirection: "row", marginLeft: 10}}>{rendered}</View>;
    } else {
      return <EmojiSearch emoji_data={me.props.item} onPress={me.on_press_emoji}/>;
    }
  }
}

const EmojiSelector = function({style, onLoaded, onSelect}) {
  const refFlatList = useRef();
  const [searchText, setSearchText] = useState("");
  const [emojis, setEmojis] = useState({enabled: {}, data: []});
  const [search_text, set_search_text] = useState("");
  
  const prepData = function(data_to_prep) {
    const enabled = {};
    const data = [];
    
    const grouped = _.groupBy(data_to_prep, "group");
    _.each(_.keys(grouped), function(category, index) {
      data.push({is_category: true, key: category});
      if (searchText === "") {
        enabled[category] = true;
        const chunks = _.chunk(grouped[category], 6);
        _.each(chunks, function(emoji_data) {
          data.push({key: emoji_data[0].char, data: emoji_data});
        });
      } else {
        _.each(grouped[category], function(emoji_data) {
          enabled[emoji_data.category] = true;
          data.push({key: emoji_data.char, data: emoji_data});
        });
      }
    });
    setEmojis({enabled: enabled, data: data});
  };

  
  useEffect(() => {
    if (searchText === "") {
      prepData(DATA);
      return;
    } else {
      const result = [];
      _.each(DATA, function(emoji_data) {
        const idx = emoji_data.name.indexOf(searchText);
        if (idx > -1) {
          emoji_data.parts = emoji_data.name.split(new RegExp(`(${searchText})`, 'gi'));
          _.each(emoji_data.parts, function(part, index) {
            if (part === searchText) {
              emoji_data.part_index = index;
            }
          });
          result.push(emoji_data);
        }
      });
      prepData(result);
    }
  }, [searchText]);
  
  const on_press = function(item) {
    onSelect(item);
  };

  const on_change_text = function(text) {
    set_search_text(text);
    const val = text.trim().toLowerCase();
    setSearchText(val);
  };
  
  const on_press_emoji_type = function(category) {
    Keyboard.dismiss();
    let item;
    _.each(emojis.data, function(row, idx) {
      if (row.is_category && row.key === category.name) {
        item = row;
      }
    });

    refFlatList.current.scrollToItem({
      item: item,
      animated: false
    });
  };
  
  const render = function({item, index}) {
    if (item.is_category) {
      return <View style={{height: 50}}><Surface style={{paddingVertical: 2, paddingLeft: 10, marginVertical: index === 0 ? 0 : 10}}><Text variant="titleMedium" style={{}}>{item.key}</Text></Surface></View>;
    }
    return <Emoji item={item.data} onPress={on_press} isInSearch={(searchText !== "")} index={index}/>;
  };
  
  const get_item_layout = function(data, index) {
    return {length: 50, offset: 50 * index, index};
  };
  
  return (
    <KeyboardAvoidingView behavior={Platform.OS == 'ios' ? 'padding' : 'height'} style={{flex: 1}}>
      <Searchbar placeholder="Search" onChangeText={on_change_text} value={search_text} autoCapitalize={false} autoCorrect={false} autoComplete="none"/>
      <View style={{flexDirection: "row", borderBottomWidth: StyleSheet.hairlineWidth}} keyboardShouldPersistTaps="always">
        <EmojiTypeButton category={CATEGORIES.smileys} onPress={on_press_emoji_type} isDisabled={!emojis.enabled[CATEGORIES.smileys.name]}/>
        <EmojiTypeButton category={CATEGORIES.people} onPress={on_press_emoji_type} isDisabled={!emojis.enabled[CATEGORIES.people.name]}/>
        <EmojiTypeButton category={CATEGORIES.animals} onPress={on_press_emoji_type} isDisabled={!emojis.enabled[CATEGORIES.animals.name]}/>
        <EmojiTypeButton category={CATEGORIES.food} onPress={on_press_emoji_type} isDisabled={!emojis.enabled[CATEGORIES.food.name]}/>
        <EmojiTypeButton category={CATEGORIES.travel} onPress={on_press_emoji_type} isDisabled={!emojis.enabled[CATEGORIES.travel.name]}/>
        <EmojiTypeButton category={CATEGORIES.activities} onPress={on_press_emoji_type} isDisabled={!emojis.enabled[CATEGORIES.activities.name]}/>
        <EmojiTypeButton category={CATEGORIES.objects} onPress={on_press_emoji_type} isDisabled={!emojis.enabled[CATEGORIES.objects.name]}/>
        <EmojiTypeButton category={CATEGORIES.symbols} onPress={on_press_emoji_type} isDisabled={!emojis.enabled[CATEGORIES.symbols.name]}/>
        <EmojiTypeButton category={CATEGORIES.flags} onPress={on_press_emoji_type} isDisabled={!emojis.enabled[CATEGORIES.flags.name]}/>
      </View>
      <FlatList
        keyboardShouldPersistTaps="always"
        key={searchText}
        ref={refFlatList}
        style={{flex:1}}
        data={emojis && emojis.data}
        renderItem={render}
        removeClippedSubviews={true}
        keyExtractor={(item) => item.key}
        getItemLayout={get_item_layout}
      />
    </KeyboardAvoidingView>
  );
};

 const styles = StyleSheet.create({
   icon_button: {
     margin: 4
   }
 });

export default EmojiSelector;