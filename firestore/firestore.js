"use strict";
import _ from "underscore";
import { collection, doc, documentId, getDoc, getDocs, increment, query, runTransaction, setDoc, updateDoc, where, Timestamp } from "firebase/firestore";
import { getHex } from "pastel-color";

const SIZE = 1080;
const WINDOW_SIZE = 390;
const MARGIN_RIGHT = 10;
const MARGIN_TOP = 10;
const CIRCLE_SIZE = 100;
const EMOJI_SIZE = 64;
const OPACITY = 0.4;

const circle_size = Math.round(SIZE * (CIRCLE_SIZE / WINDOW_SIZE));
const margin_circle_top = Math.round(SIZE * (MARGIN_TOP / WINDOW_SIZE));
const margin_circle_right = Math.round(SIZE * (MARGIN_RIGHT / WINDOW_SIZE));
const icon_size = Math.round(SIZE * (EMOJI_SIZE / WINDOW_SIZE));
const margin_icon_top = margin_circle_top + Math.round((circle_size - icon_size) / 2);
const margin_icon_right = margin_circle_right + Math.round((circle_size - icon_size) / 2);

let $, db;

const firestore = {
  set_$: function(_$) {
    $ = _$;
    db = $.db;
  },
  load_users: async function(params, relationship_by_uid) {
    const uids = [];
    if (_.size(params.ids) === 0) {
      return uids;
    }
    const chunks = _.chunk(params.ids, 10);
    await Promise.all(chunks.map(async (chunk) => {
      const relationship_chunk = [];
      _.each(chunk, function(uid) {
        if (uid !== $.session.uid) {
          relationship_chunk.push($.session.uid + uid);
        }
      });
      const q_user = query(collection(db, "user"), where(documentId(), "in", chunk));
      const q_relationship = (relationship_by_uid || _.size(relationship_chunk) === 0) ? null : query(collection(db, "relationship"), where(documentId(), "in", relationship_chunk));
      let snap_users, snap_relationships;
      await Promise.all([
        snap_users = await getDocs(q_user),
        snap_relationships = (q_relationship) ? await getDocs(q_relationship) : null
      ]);

      if (!relationship_by_uid) {
        relationship_by_uid = {};
        if (snap_relationships) {
          _.each(snap_relationships.docs, function(doc_relationship) {
            const relationship = doc_relationship.data();
            relationship_by_uid[relationship.uid] = relationship;
          });
        }
      }

      const current_post_ids = [];
      _.each(snap_users.docs, function(doc_user) {
        const user = doc_user.data();
        if (user.current_post_id) {
          current_post_ids.push(user.current_post_id);
        }
        uids.push(user.id);
        user.outgoing_status = relationship_by_uid[user.id] ? relationship_by_uid[user.id].status : "none";
        $.cache.set(user);
      });

      if (_.size(current_post_ids)) {
        const chunks_post_ids = _.chunk(current_post_ids, 10);
        await Promise.all(chunks_post_ids.map(async (chunk_post_ids) => {
          const q_post = query(collection(db, "post"), where(documentId(), "in", chunk_post_ids));
          const snap_posts = await getDocs(q_post);
          _.each(snap_posts.docs, function(doc_post) {
            $.cache.set(doc_post.data());
          });
        }));
      }


    }));
    return uids;
  },
  invite_contact: async function(params) {
    const invited_doc_ref = doc(db, "invited", params.uid);
    const invited = {};
    _.each(params.phones, function(phone) {
      invited[phone] = Timestamp.now();
    });
    await setDoc(invited_doc_ref, invited, { merge: true });
  },
  create_messaging_config: async function(params) {
    const messaging_config_doc_ref = doc(db, "messaging_config", params.token);
    const update = { uid: $.session.uid, token: params.token, created_at: Timestamp.now() };
    await setDoc(messaging_config_doc_ref, update);
    $.session.messaging_config = update;
  },
  update_messaging_config: async function(params) {
    const messaging_config_doc_ref = doc(db, "messaging_config", params.token);
    const update = params.settings;
    update.updated_at = Timestamp.now();
    update.uid = $.session.uid;
    await updateDoc(messaging_config_doc_ref, update);
    _.extend($.session.messaging_config, update);
  },
  is_username_available: async function(params) {
    const username_ref = doc(db, "username", params.username);
    const username_doc_snap = await getDoc(username_ref);
    return !username_doc_snap.exists();
  },
  update_user_account_privacy: async function(params) {
    const user_doc_ref = doc(db, "user", params.id);
    const update = { is_account_public: params.is_account_public };
    await updateDoc(user_doc_ref, update);
    $.get_current_user().is_account_public = params.is_account_public;
  },
  update_user: async function(params) {
    const user_doc_ref = doc(db, "user", params.id);
    const user_doc_snap = await getDoc(user_doc_ref);
    if (!user_doc_snap.exists()) {
      throw new Error("User not found.");
    }
    const user = user_doc_snap.data();
    const user_updates = {};
    await runTransaction(db, async (transaction) => {
      let username,
        username_doc_ref;
      if (params.username) {
        username_doc_ref = doc(db, "username", params.username.toLowerCase());
        const username_doc_snap = await transaction.get(username_doc_ref);
        if (username_doc_snap.exists()) {
          throw new Error("Username taken.");
        }
        username = {
          id: params.username.toLowerCase(),
          created_at: Timestamp.now(),
          uid: params.id
        };
        user_updates.username = params.username;
        user_updates.change_username_at = Timestamp.now();
        if (!user.profile_image_url || user.profile_image_url.indexOf("ui-avatars.com") !== -1) {
          user_updates.profile_image_url = "https://ui-avatars.com/api/?name=" + params.username + "&size=110&length=2&rounded=true&color=ffffff&background=" + getHex(params.username).replace("#", "");
        }
      }

      if (params.profile_image_url) {
        user_updates.profile_image_url = params.profile_image_url;
      }

      if (params.name) {
        user_updates.name = params.name;
      }
      if (params.bio) {
        user_updates.bio = params.bio;
      }

      if (_.size(username)) {
        transaction.set(username_doc_ref, username);
      }

      if (_.size(user_updates)) {
        transaction.update(user_doc_ref, user_updates);
      }
    });
    _.extend($.get_current_user(), user_updates);
  },
  update_relationship: async function(params) {
    const current_user_ref = doc(db, "user", $.session.uid);
    const user_ref = doc(db, "user", params.uid);
    const relationship_doc_ref = doc(db, "relationship", $.session.uid + params.uid);
    const other_relationship_ref = doc(db, "relationship", params.uid + $.session.uid);

    const current_user = $.get_current_user();
    const user = $.cache.get(params.uid);

    if (!current_user || !user) {
      return;
    }

    const result = { outgoing_status: "none" };

    await runTransaction(db, async (transaction) => {
      if (params.action === "approve" || params.action === "deny") {
        const other_relationship_doc_snap = await transaction.get(other_relationship_ref);
        if (other_relationship_doc_snap.exists()) {
          const other_relationship = other_relationship_doc_snap.data();
          if (other_relationship.status === "request") {
            await transaction.set(relationship_doc_ref, {
              id: user.id,
              uid: current_user.id,
              updated_at: Timestamp.now(),
              status: params.action === "approve" ? "follow" : "none"
            });
            const current_user_update = { updated_at: Timestamp.now() };
            current_user_update.request_by_count = increment(-1);
            _.isNumber(current_user.request_by_count) ? current_user.request_by_count-- : current_user.request_by_count = 0;
            const user_update = { updated_at: Timestamp.now() };
            user_update.request_count = increment(-1);
            _.isNumber(user_update.request_count) ? current_user.request_count-- : current_user.request_by_count = 0;
            if (params.action === "approve") {
              current_user_update.follow_by_count = increment(1);
              user_update.follow_count = increment(1);
              _.isNumber(current_user_update.follow_by_count) ? current_user.follow_by_count++ : current_user.follow_by_count = 1;
              _.isNumber(user_update.follow_count) ? user.follow_count++ : current_user.follow_count = 1;
            }
            await transaction.update(current_user_ref, current_user_update);
            await transaction.update(user_ref, user_update);
          }
        }
        const relationship_doc_snap = getDoc(relationship_doc_ref);
        const outgoing_status = relationship_doc_snap.exists() ? relationship_doc_snap.data().status : "none";

        user.outgoing_status = outgoing_status;
        return { outgoing_status: outgoing_status };
      }

      const relationship_doc_snap = await transaction.get(relationship_doc_ref);
      let relationship;
      if (relationship_doc_snap.exists()) {
        relationship = relationship_doc_snap.data();
        result.outgoing_status = relationship.status;
      }

      if (relationship && relationship.status === "block" && params.action !== "unblock") {
        _.extend(user, result);
        return result;
      }

      if (params.action === "follow") {
        if (!relationship || relationship.status === "none") {
          result.outgoing_status = user.is_account_public ? "follow" : "request";
          await transaction.set(relationship_doc_ref, {
            id: current_user.id,
            uid: user.id,
            updated_at: Timestamp.now(),
            status: result.outgoing_status
          });
          const current_user_update = { updated_at: Timestamp.now() };
          if (user.is_account_public) {
            current_user_update.follow_count = increment(1);
            _.isNumber(current_user.follow_count) ? current_user.follow_count++ : current_user.follow_count = 0;
          }
          else {
            current_user_update.request_count = increment(1);
            _.isNumber(current_user.request_count) ? current_user.request_count++ : current_user.request_count = 0;
          }
          
          await transaction.update(current_user_ref, current_user_update);
          const user_update = { updated_at: Timestamp.now() };
          if (user.is_account_public) {
            user_update.follow_by_count = increment(1);
            _.isNumber(user.follow_by_count) ? user.follow_by_count++ : user.follow_by_count = 0;
          }
          else {
            user_update.request_by_count = increment(1);
            _.isNumber(user.request_by_count) ? user.request_by_count++ : user.request_by_count = 0;
          }
          await transaction.update(user_ref, user_update);
        }
      }
      else if (params.action === "unfollow") {
        if (relationship && (relationship.status === "follow" || relationship.status === "request" || relationship.status === "ignore")) {
          result.outgoing_status = "none";
          await transaction.set(relationship_doc_ref, {
            id: current_user.id,
            uid: user.id,
            updated_at: Timestamp.now(),
            status: result.outgoing_status
          });
          const current_user_update = { updated_at: Timestamp.now() };
          const user_update = { updated_at: Timestamp.now() };
          if (relationship.status === "follow") {
            current_user_update.follow_count = increment(-1);
            user_update.follow_by_count = increment(-1);
            _.isNumber(current_user.follow_count) ? current_user.follow_count-- : current_user.follow_count = 0;
            _.isNumber(user.follow_by_count) ? user.follow_by_count-- : user.follow_by_count = 0;
          }
          else if (relationship.status === "request") {
            current_user_update.request_count = increment(-1);
            user_update.request_by_count = increment(-1);
            _.isNumber(current_user.request_count) ? current_user.request_count-- : current_user.request_count = 0;
            _.isNumber(user.request_by_count) ? user.request_by_count-- : user.request_by_count = 0;
          }
          else if (relationship.status === "ignore") {
            current_user_update.ignore_by_count = increment(-1);
            user_update.ignore_count = increment(-1);
            _.isNumber(current_user.ignore_by_count) ? current_user.ignore_by_count-- : current_user.ignore_by_count = 0;
            _.isNumber(user.ignore_count) ? user.ignore_count-- : user.ignore_count = 0;
          }
          await transaction.update(current_user_ref, current_user_update);
          await transaction.update(user_ref, user_update);
        }
      }
      else if (params.action === "block") {
        if (!relationship || (relationship.status !== "block")) {
          const other_relationship_ref = doc(db, "relationship", params.uid + $.session.uid);
          result.outgoing_status = "block";
          await transaction.set(relationship_doc_ref, {
            id: current_user.id,
            uid: user.id,
            updated_at: Timestamp.now(),
            status: result.outgoing_status
          });
          await transaction.set(other_relationship_ref, {
            id: user.id,
            uid: current_user.id,
            updated_at: Timestamp.now(),
            status: "none",
            is_blocked: true
          });
          const current_user_update = { updated_at: Timestamp.now() };
          current_user_update.block_count = increment(1);
          if (relationship) {
            if (relationship.status === "follow") {
              current_user_update.follow_count = increment(-1);
              _.isNumber(current_user.follow_count) ? current_user.follow_count-- : current_user.follow_count = 0;
            }
            else if (relationship.status === "request") {
              current_user_update.request_count = increment(-1);
              _.isNumber(current_user.follow_count) ? current_user.request_count-- : current_user.request_count = 0;
            }
          }
          await transaction.update(current_user_ref, current_user_update);
          const user_update = { updated_at: Timestamp.now() };
          if (relationship) {
            if (relationship.status === "follow") {
              user_update.follow_by_count = increment(-1);
              _.isNumber(user.follow_by_count) ? user.follow_by_count-- : user.follow_by_count = 0;
            }
            else if (relationship.status === "request") {
              user_update.request_by_count = increment(-1);
              _.isNumber(user.request_by_count) ? user.request_by_count-- : user.request_by_count = 0;
            }
          }
          user_update.block_by_count = increment(1);
          await transaction.update(user_ref, user_update);
        }
      }
      else if (params.action === "unblock") {
        if (relationship && (relationship.status === "block")) {
          const other_relationship_ref = doc(db, "relationship", params.uid + $.session.uid);
          result.outgoing_status = "none";
          await transaction.set(relationship_doc_ref, {
            id: current_user.id,
            uid: user.id,
            updated_at: Timestamp.now(),
            status: result.outgoing_status
          });
          await transaction.set(other_relationship_ref, {
            id: user.id,
            uid: current_user.id,
            updated_at: Timestamp.now(),
            status: "none",
            is_blocked: false
          });
          const current_user_update = { updated_at: Timestamp.now() };
          current_user_update.block_count = increment(-1);
          await transaction.update(current_user_ref, current_user_update);
          const user_update = { updated_at: Timestamp.now() };
          user_update.block_by_count = increment(-1);
          await transaction.update(user_ref, user_update);
        }
      }
    });
    _.extend($.cache.get(params.uid), result);
    return result;
  },
  save_post: async function(params) {
    const url_parts = params.image.url.split("/upload");
    const url = url_parts[0] + "/upload/c_scale,g_north_east,l_misc:circle_r39zfi.png,w_" + circle_size + ",h_" + circle_size + ",x_" + margin_circle_right + ",y_" + margin_circle_top + "/c_scale,g_north_east,l_emojis:" + params.emoji.id + ".png,w_" + icon_size + ",h_" + icon_size + ",x_" + margin_icon_right + ",y_" + margin_icon_top + url_parts[1];
    const now = Timestamp.now();
    const new_id = doc(collection(db, "post")).id;
    const new_post = {
      id: new_id,
      uid: params.uid,
      created_at: now,
      updated_at: now,
      image: params.image,
      emoji: params.emoji,
      foo: { "1080": { url: url_parts[0] + "/upload/c_scale,g_north_east,l_misc:circle_r39zfi.png,w_" + circle_size + ",h_" + circle_size + ",x_" + margin_circle_right + ",y_" + margin_circle_top + "/c_scale,g_north_east,l_emojis:" + params.emoji.id + ".png,w_" + icon_size + ",h_" + icon_size + ",x_" + margin_icon_right + ",y_" + margin_icon_top + url_parts[1] } },
      image_urls: { "1080": { url: url, width: params.image.width, height: params.image.height } },
    };

    const new_post_ref = doc(db, "post", new_post.id);
    const current_user_ref = doc(db, "user", params.uid);
    await runTransaction(db, async (transaction) => {
      await transaction.set(new_post_ref, new_post);
      await transaction.update(current_user_ref, {
        post_count: increment(1),
        current_post_id: new_post.id
      });
    });

    $.cache.set(new_post);
    const current_user = $.get_current_user();
    _.extend(current_user, {
      post_count: _.isNumber(current_user.post_count) ? current_user.post_count++ : 1,
      current_post_id: new_post.id
    });
    
    const history = $.cache.get("history");
    if (history) {
      history.data.unshift(new_post.id);
    }
    
    return new_post;
  }
};

export default firestore;
