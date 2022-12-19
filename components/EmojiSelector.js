"use strict";
import $ from "../setup";
import React, { useEffect, useRef, useState}  from "react";
import _ from "underscore";
import { Keyboard, KeyboardAvoidingView, Platform, StyleSheet, View} from 'react-native';
import TouchableOpacity  from "../components/TouchableOpacity";
import { Chip, IconButton, Searchbar, Surface, Text, useTheme } from 'react-native-paper';
import { FlashList } from "@shopify/flash-list";

const SELECT_ICON_SIZE = 16;
const ICON_WIDTH = 40;
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
  const MARGIN_HORIZONTAL = ($.const.width - (ICON_WIDTH*6))/12;
  
  const on_press = function() {
    onPress(emoji_data);
  };
  
  return (
    <View key={emoji_data.char} style={{height: ROW_HEIGHT, width: ICON_WIDTH, marginHorizontal: MARGIN_HORIZONTAL}}>
      <Text onPress={on_press} style={{ fontFamily: "TwemojiMozilla", fontSize: ICON_WIDTH}}>{emoji_data.char}</Text>
    </View>
  );
};

const EmojiSearch = function({emoji_data, onPress}) {
  const { colors } = useTheme();
  
  if (!emoji_data) {
    return;
  }
  
  const on_press = function() {
    onPress(emoji_data);
  };
  
  let now = Date.now();
  const keywords = [];
  _.each(emoji_data.keywords, function(keyword, keyword_index) {
    if (emoji_data.parts_by_keyword[keyword]) {
      const parts = [];
      _.each(emoji_data.parts_by_keyword[keyword].parts, function(part, part_index) {
        parts.push(<Text key={++now} style={{color: part_index === emoji_data.parts_by_keyword[keyword].part_index ? colors.primary : undefined, fontWeight: part_index === emoji_data.parts_by_keyword[keyword].part_index ? "bold" : undefined}}>{part}</Text>);
      });
      keywords.push(<Chip key={++now} style={{marginLeft: 10}} mode="outlined">{parts}</Chip>);
    }
  });
  
  return (
    <TouchableOpacity style={{flex:1, flexDirection: "row", alignItems: "center", height: ROW_HEIGHT, marginLeft: 10}} onPress={on_press}>
      <Text onPress={on_press} style={{ fontFamily: "TwemojiMozilla", fontSize: 40, width: 40}}>{emoji_data.char}</Text>
      {keywords}
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
      _.each(me.props.item, function(emoji_data, index) {
        rendered.push(<EmojiPart key={emoji_data.char} emoji_data={emoji_data} onPress={me.on_press_emoji}/>);
      });
      return <View style={{flexDirection: "row"}}>{rendered}</View>;
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
      prepData($.emoji_data);
      return;
    } else {
      const result = [];
      _.each($.emoji_data, function(emoji_data) {
        delete emoji_data.parts_by_keyword;
        let is_candidate = false;
        _.each(emoji_data.keywords, function(keyword) {
          if (keyword.indexOf(searchText) === 0) {
            is_candidate = true;
            if (!emoji_data.parts_by_keyword) {
              emoji_data.parts_by_keyword = {};
            }
            emoji_data.parts_by_keyword[keyword] = {parts: keyword.split(new RegExp(`(${searchText})`, 'gi'))};
            _.each(emoji_data.parts_by_keyword[keyword].parts, function(part, index) {
              if (part === searchText) {
                emoji_data.parts_by_keyword[keyword].part_index = index;
              }
            });
          }
        });
        if (is_candidate) {
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
      <FlashList
        keyboardShouldPersistTaps="always"
        key={searchText}
        ref={refFlatList}
        data={emojis && emojis.data}
        renderItem={render}
        removeClippedSubviews={true}
        keyExtractor={(item) => item.key || item.char}
        estimatedItemSize={49}
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