"use strict";
import $ from "../../setup";
import _ from "underscore";
import { FlatList, SectionList, Text } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import EmojiSelector2 from "../../components/EmojiSelector2";



const AlertsScreen = function() {
  return (
    <SafeAreaView style ={{flex: 1}} edges={'top'}>
      <EmojiSelector2/>
    </SafeAreaView>
  );
};


export default AlertsScreen;