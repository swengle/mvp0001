"use strict";
import React, { useEffect, useRef, useState}  from "react";
import _ from "underscore";
import { FlatList, KeyboardAvoidingView, Platform, StyleSheet, TouchableOpacity, View} from 'react-native';
import { IconButton, Surface, Text } from 'react-native-paper';
import IconTextInput from "./IconTextInput";

const DATA = require("./emoji.json");

const SELECT_ICON_SIZE = 16;
const ROW_HEIGHT = 50;

const CATEGORIES = {
  smileys: {name: "Smileys and emotions", icon: "emoticon"},
  people: {name: "People", icon: "account-multiple"},
  animals: {name: "Animals and nature", icon: "dog"},
  food: {name: "Food and drink", icon: "food-apple"},
  travel: {name: "Travel and places", icon: "car"},
  activities: {name: "Activities and events", icon: "basketball"},
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

class Emoji extends React.PureComponent {
  constructor(props) {
    super(props);
    this.on_press = this.on_press.bind(this);
  }
  
  on_press() {
    this.props.onPress && this.props.onPress();
  }
  
  render() {
    const me = this;
    if (_.isArray(me.props.item)) {
      const rendered = [];
      _.each(me.props.item, function(emoji) {
        rendered.push(<View key={emoji.base} style={{height: ROW_HEIGHT, flex: 1/6}}>
          <Text onPress={me.on_press} style={{ fontFamily: "TwemojiMozilla", fontSize: 40}}>{emoji.base}</Text>
        </View>);
      });
      return <View style={{flexDirection: "row", marginLeft: 10}}>{rendered}</View>;
    } else {
      const parts = [];
      _.each(me.props.item.parts, function(part, index) {
        parts.push(<Text style={index === me.props.item.part_index ? {fontWeight: "bold"} : null}>{part}</Text>);
      });
      return <TouchableOpacity style={{flex:1, flexDirection: "row", alignItems: "center", height: ROW_HEIGHT, marginLeft: 10}}>
        <Text onPress={me.on_press} style={{ fontFamily: "TwemojiMozilla", fontSize: 40, width: 40}}>{me.props.item.base}</Text>
        <Text style={{marginLeft: 8, textAlign: "left"}}>
          {parts}
        </Text>
      </TouchableOpacity>;
    }
  }
}

const EmojiSelector = function({style, onLoaded}) {
  const refFlatList = useRef();
  const [searchText, setSearchText] = useState("");
  const [emojis, setEmojis] = useState({enabled: {}, data: []});
  
  const prepData = function(data_to_prep) {
    let now = Date.now();
    const enabled = {};
    const data = [];
    
    const grouped = _.groupBy(data_to_prep, "category");
    _.each(_.keys(grouped), function(category, index) {
      data.push({is_category: true, key: category});
      if (searchText === "") {
        enabled[category] = true;
        const chunks = _.chunk(grouped[category], 6);
        _.each(chunks, function(chunk) {
          data.push({key: now++, data: chunk});
        });
      } else {
        _.each(grouped[category], function(emoji) {
          enabled[emoji.category] = true;
          data.push({key: now++, data: emoji});
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
    _.each(DATA, function(record) {
      _.each(record.shortcodes, function(shortcode) {
          const idx = shortcode.indexOf(searchText);
          if (idx > -1) {
            record.parts = shortcode.split(new RegExp(`(${searchText})`, 'gi'));
            _.each(record.parts, function(part, index) {
              if (part === searchText) {
                record.part_index = index;
              }
            });
            result.push(record);
          }
        });
      });
      prepData(result);
    }
  }, [searchText]);
  
  const on_press = function() {
    alert("wjd");
  };

  const on_change_text = function(text) {
    const val = text.trim().toLowerCase();
    setSearchText(val);
  };
  
  const on_press_emoji_type = function(category) {
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
  
  /*
  const on_press_emoji_type = function(category) {
    let offset = 0, done = false;
    _.each(emojis.data, function(row, idx) {
      if (done) {
        return;
      }
      if (row.is_category) {
        if (row.key === category.name) {
          done = true;
        } else {
          offset += 40; 
        }
      } else {
        offset += 50;
      }
    });

    refFlatList.current.scrollToOffset({
      offset: offset,
      animated: false
    });
  };
  */
  
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
      <IconTextInput icon="search" placeholder="Search" is_auto_focus={false} style={{borderBottomWidth: StyleSheet.hairlineWidth, borderTopWidth: StyleSheet.hairlineWidth}} on_change_text={on_change_text}/>
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