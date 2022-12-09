"use strict";
import $ from "../../setup";
import { useEffect, useState } from "react";
import { SafeAreaView } from 'react-native-safe-area-context';
import { FlatList, RefreshControl } from "react-native";
import Header from "../../components/Header";
import { useToast } from "react-native-toast-notifications";
import UserRow from "../../components/UserRow";
import ListHeader from "../../components/ListHeader";
import ListFooter from "../../components/ListFooter";
import ListEmpty from "../../components/ListEmpty";
import { useSnapshot } from "valtio";
import { useTheme } from "react-native-paper";

const UserListScreen = function({navigation, route}) {
  const [extra_data, set_extra_data] = useState(new Date());
  const toast = useToast();
  const user_id = route.params.user_id;
  const { colors } = useTheme();
  
  const url = "users/" + user_id + ((route.params.title === "Following") ? "/follow" : "/follow-by");
  const [fetcher] = useState($.list_fetcher.create({
    url: url,
  }));

  const snap_fetcher = useSnapshot(fetcher.state);
  
  const refresh = async () => {
    try {
      await fetcher.refresh(); 
    } catch (e) {
      $.display_error(toast, new Error("Failed to load users."));
    }
  };
    
  useEffect(() => {
    refresh();
  }, []);
  
  const on_press_back = function() {
    navigation.goBack();
  };
  
  const on_refresh_needed = function() {
    set_extra_data(new Date());
  };
  
  const render_user = function(row) {
    return <UserRow row={row} navigation={navigation} onRefreshNeeded={on_refresh_needed}/>;
  };
  
  const on_press_retry = async function() {
    await refresh();
  };
  
  return (
    <SafeAreaView style ={{flex: 1}} edges={['top', 'left', 'right']}>
      <Header title={route.params.title} on_press_back={on_press_back}/>
      <FlatList
        style={{flex: 1}}
        keyboardShouldPersistTaps="always"
        data={snap_fetcher.data}
        renderItem={render_user}
        keyExtractor = { item => item.id }
        extraData = { extra_data }
        ListHeaderComponent = <ListHeader is_error={snap_fetcher.refresh_error} on_press_retry={on_press_retry}/>
        ListFooterComponent = <ListFooter is_error={snap_fetcher.load_more_error} on_press_retry={on_press_retry}/>
        ListEmptyComponent = <ListEmpty text="No users found"/>
        refreshControl={
          <RefreshControl
            refreshing={snap_fetcher.is_refreshing}
            onRefresh={refresh}
            tintColor={colors.secondary}
            colors={[colors.secondary]}
          />
        }
      />
    </SafeAreaView>
  );
};


export default UserListScreen;