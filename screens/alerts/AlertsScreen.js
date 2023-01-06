"use strict";
import $ from "../../setup";
import _ from "underscore";
import { FlatList, View } from 'react-native';
import { Appbar, Badge, List, useTheme } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';

const AlertsListHeader = function({navigation}) {
  const { colors } = useTheme();
  const snap_user = $.get_snap_current_user();
  
  const on_press_friend_requests = function() {
    navigation.push("UserListScreen", {screen: "RequestByScreen"});
  };
  
  if (_.isNumber(snap_user.request_by_count) && snap_user.request_by_count > 0) {
    return (
      <View style={{marginLeft: 10}}>
        <List.Section>
          <List.Item
            title={"Friend Requests"}
            left={(_.isNumber(snap_user.request_by_count) && snap_user.request_by_count > 0) ? props => <View style={{flexDirection: "row"}}>{(_.isNumber(snap_user.unread_request_by_count) && snap_user.unread_request_by_count > 0) && <Badge style={{marginRight: 8}}>{snap_user.unread_request_by_count}</Badge>}<Badge style={{backgroundColor: colors.text}}>{snap_user.request_by_count}</Badge></View> : null}
            right={props => <List.Icon {...props} icon="chevron-right"/>}
            onPress={on_press_friend_requests}
          />
        </List.Section>
      </View>
    );
  }
  return null;
};

const AlertsScreen = function({navigation}) {
  return (
    <SafeAreaView style ={{flex: 1}} edges={"top", "left", "right"}>
      <Appbar.Header>
        <Appbar.Content title={"Alerts"} />
      </Appbar.Header>
      <FlatList
        data={null}
        ListHeaderComponent=<AlertsListHeader navigation={navigation}/>
      />
    </SafeAreaView> 
  );
};


export default AlertsScreen;