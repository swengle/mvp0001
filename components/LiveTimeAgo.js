"use strict";
import $ from "../setup";
import { useEffect, useState } from "react";
import { Text } from "react-native-paper";

const LiveTimeAgo = function({ date, style }) {
  const [, set_time] = useState(Date.now());
  
  useEffect(() => {
    const interval = setInterval(() => set_time(Date.now()), 1000);
    return () => {
      clearInterval(interval);
    };
  }, []);

  return <Text style={style}>{$.timeago.format(date)}</Text>;
};

export default LiveTimeAgo;
