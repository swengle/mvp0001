"use strict";
import _ from "underscore";
import { collection, deleteField, doc, documentId, getDoc, getDocs, increment, query, runTransaction, setDoc, updateDoc, where, Timestamp } from "firebase/firestore";
import { getHex } from "pastel-color";
import useCachedData from "../hooks/useCachedData";

let $, db;

const max_query_in_size = 10;

const firestore = {
  set_$: function(_$) {
    $ = _$;
    db = $.db;
  },
  inflate_posts: async function(params, cache_set) {
    if (_.size(params.posts) === 0) {
      return;
    }
    const chunks = _.chunk(params.posts, max_query_in_size);
    await Promise.all(chunks.map(async (chunk) => {
      const reaction_chunk = [];
      _.each(chunk, function(post) {
        reaction_chunk.push("like-" + post.id);
      });
      const q_reaction = query(collection(db, "user/" + $.session.uid + "/reaction"), where(documentId(), "in", reaction_chunk));
      const snap_reactions = await getDocs(q_reaction);
      const liked_by_post_id = {};
      _.each(snap_reactions.docs, function(reaction_doc) {
        if (reaction_doc.exists()) {
          const reaction = reaction_doc.data();
          if (reaction.is_liked) {
            liked_by_post_id[reaction.parent_id] = true;
          }
        }
      });
      _.each(chunk, function(post) {
        post.is_liked = liked_by_post_id[post.id] || false;
        cache_set(post);
      });
    }));
  },
  inflate_comments: async function(params, cache_set) {
    if (_.size(params.comments) === 0) {
      return;
    }
    const chunks = _.chunk(params.comments, max_query_in_size);
    await Promise.all(chunks.map(async (chunk) => {
      const uids = {};
      const comment_ids = [];
      _.each(chunk, function(comment) {
        uids[comment.uid] = true;
        comment_ids.push("like-" + comment.id);
      });

      const q_reaction = query(collection(db, "user/" + $.session.uid + "/reaction"), where(documentId(), "in", comment_ids));
      let snap_reactions;
      await Promise.all([
        await firestore.load_users({ uids: _.keys(uids) }),
        snap_reactions = await getDocs(q_reaction)
      ]);

      const liked_by_comment_id = {};
      _.each(snap_reactions.docs, function(reaction_doc) {
        if (reaction_doc.exists()) {
          const reaction = reaction_doc.data();
          if (reaction.is_liked) {
            liked_by_comment_id[reaction.parent_id] = true;
          }
        }
      });

      _.each(chunk, function(comment) {
        comment.is_liked = liked_by_comment_id[comment.id] || false;
        cache_set(comment, { is_unshift: true });
      });
    }));
  },
  load_users: async function(params, cache_set, options) {
    options = options || {};
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
      const q_relationship = (options.relationship_by_uid || _.size(relationship_chunk) === 0) ? null : query(collection(db, "user/" + $.session.uid + "/relationship"), where(documentId(), "in", relationship_chunk));
      const q_current_post = query(collection(db, "post"), where("active_uid", "in", chunk));
      let snap_users, snap_relationships, snap_posts;
      await Promise.all([
        snap_users = await getDocs(q_user),
        snap_posts = await getDocs(q_current_post),
        snap_relationships = (q_relationship) ? await getDocs(q_relationship) : null
      ]);

      if (!options.relationship_by_uid) {
        options.relationship_by_uid = {};
        if (snap_relationships) {
          _.each(snap_relationships.docs, function(doc_relationship) {
            const relationship = doc_relationship.data();
            options.relationship_by_uid[relationship.uid] = relationship;
          });
        }
      }

      const posts = [];
      _.each(snap_posts.docs, function(post_doc) {
        posts.push(post_doc.data());
      });

      if (_.size(posts)) {
        await firestore.inflate_posts({ posts: posts }, useCachedData.cache_set);
      }

      _.each(snap_users.docs, function(doc_user) {
        const user = doc_user.data();
        uids.push(user.id);
        user.outgoing_status = options.relationship_by_uid[user.id] ? options.relationship_by_uid[user.id].status : "none";
        cache_set ? cache_set(user) : useCachedData.cache_set(user);
      });
    }));
    return uids;
  },
  invite_contact: async function(params) {
    const invited_doc_ref = doc(db, "user/" + $.session.uid + "/invited/contacts");
    const invited = {};
    _.each(params.phones, function(phone) {
      invited[phone] = Timestamp.now();
    });
    await setDoc(invited_doc_ref, invited, { merge: true });
  },
  create_messaging_config: async function(params) {
    const messaging_config_doc_ref = doc(db, "user/" + $.session.uid + "/messaging_config", params.token);
    const update = { uid: $.session.uid, token: params.token, created_at: Timestamp.now(), rev: 0 };
    await setDoc(messaging_config_doc_ref, update);
    $.session.messaging_config = update;
  },
  update_messaging_config: async function(params) {
    const messaging_config_doc_ref = doc(db, "user/" + $.session.uid + "/messaging_config", params.token);
    const update = params.settings;
    update.updated_at = Timestamp.now();
    update.uid = $.session.uid;
    await updateDoc(messaging_config_doc_ref, _.extend({ rev: increment(1) }, update));
    _.extend($.session.messaging_config, update);
  },
  is_username_available: async function(params) {
    const username_ref = doc(db, "username", params.username);
    const username_doc_snap = await getDoc(username_ref);
    return !username_doc_snap.exists();
  },
  update_current_user_account_privacy: async function(params) {
    const user_doc_ref = doc(db, "user", $.session.uid);
    const update = { is_account_public: params.is_account_public };
    await updateDoc(user_doc_ref, _.extend({ rev: increment(1) }, update));
    $.get_current_user().is_account_public = params.is_account_public;
  },
  update_current_user: async function(params) {
    const user_doc_ref = doc(db, "user", $.session.uid);
    const user_doc_snap = await getDoc(user_doc_ref);
    if (!user_doc_snap.exists()) {
      throw new Error("User not found.");
    }
    const user = user_doc_snap.data();
    const user_updates = {};
    let username,
      username_doc_ref;
    await runTransaction(db, async (transaction) => {
      if (params.username) {
        username_doc_ref = doc(db, "username", params.username.toLowerCase());
        const username_doc_snap = await transaction.get(username_doc_ref);
        if (username_doc_snap.exists()) {
          throw new Error("Username taken.");
        }
        username = {
          id: params.username.toLowerCase(),
          created_at: Timestamp.now(),
          uid: $.session.uid,
          rev: 0
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

      if (_.isString(params.name)) {
        user_updates.name = params.name;
      }
      if (_.isString(params.bio)) {
        user_updates.bio = params.bio;
      }

      if (_.size(username)) {
        transaction.set(username_doc_ref, _.extend({ rev: increment(1) }, username));
      }

      if (_.size(user_updates)) {
        transaction.update(user_doc_ref, _.extend({ rev: increment(1) }, user_updates));
      }
    });
    _.extend($.get_current_user(), user_updates);
  },
  update_relationship: async function(params) {
    const current_user_ref = doc(db, "user", $.session.uid);
    const user_ref = doc(db, "user", params.id);
    const relationship_doc_ref = doc(db, "user" + $.session.uid + "/relationship", params.id);
    const other_relationship_ref = doc(db, "user/" + params.id + "/relationship", $.session.uid);

    const current_user = $.get_current_user();
    const user = useCachedData.cache_get(params.id);

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
            await transaction.update(other_relationship_ref, {
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
              _.isNumber(current_user_update.follow_by_count) ? ++current_user.follow_by_count : current_user.follow_by_count = 1;
              _.isNumber(user_update.follow_count) ? ++user.follow_count : current_user.follow_count = 1;
            }
            await transaction.update(current_user_ref, _.extend({rev: increment(1)}, current_user_update));
            await transaction.update(user_ref, _.extend({rev: increment(1)}, user_update));
          }
        }
        const relationship_doc_snap = getDoc(relationship_doc_ref);
        user.outgoing_status = relationship_doc_snap.exists() ? relationship_doc_snap.data().status : "none";
        return { outgoing_status: user.outgoing_status };
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
          if (relationship) {
            await transaction.update(relationship_doc_ref, {
              updated_at: Timestamp.now(),
              status: result.outgoing_status,
              rev: increment(1)
            });
          }
          else {
            await transaction.set(relationship_doc_ref, {
              id: current_user.id,
              uid: user.id,
              updated_at: Timestamp.now(),
              status: result.outgoing_status,
              rev: 0
            });
          }
          const current_user_update = { updated_at: Timestamp.now() };
          if (user.is_account_public) {
            current_user_update.follow_count = increment(1);
            _.isNumber(current_user.follow_count) ? ++current_user.follow_count : current_user.follow_count = 0;
          }
          else {
            current_user_update.request_count = increment(1);
            _.isNumber(current_user.request_count) ? ++current_user.request_count : current_user.request_count = 0;
          }

          await transaction.update(current_user_ref, _.extend({rev: increment(1)}, current_user_update));
          const user_update = { updated_at: Timestamp.now() };
          if (user.is_account_public) {
            user_update.follow_by_count = increment(1);
            _.isNumber(user.follow_by_count) ? ++user.follow_by_count : user.follow_by_count = 0;
          }
          else {
            user_update.request_by_count = increment(1);
            _.isNumber(user.request_by_count) ? ++user.request_by_count : user.request_by_count = 0;
          }
          await transaction.update(user_ref, _.extend({rev: increment(1)}, user_update));
        }
      }
      else if (params.action === "unfollow") {
        if (relationship && (relationship.status === "follow" || relationship.status === "request" || relationship.status === "ignore")) {
          result.outgoing_status = "none";
          if (relationship) {
            await transaction.update(relationship_doc_ref, {
              updated_at: Timestamp.now(),
              status: result.outgoing_status,
              rev: increment(1)
            });
          }
          else {
            await transaction.set(relationship_doc_ref, {
              id: current_user.id,
              uid: user.id,
              updated_at: Timestamp.now(),
              status: result.outgoing_status,
              rev: 0
            });
          }
          
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
          await transaction.update(current_user_ref, _.extend({rev: increment(1)}, current_user_update));
          await transaction.update(user_ref, _.extend({rev: increment(1)}, user_update));
        }
      }
      else if (params.action === "block") {
        if (!relationship || (relationship.status !== "block")) {
          result.outgoing_status = "block";
          const other_relationship_doc_snap = await transaction.get(other_relationship_ref);
          
          if (relationship) {
            await transaction.update(relationship_doc_ref, {
              updated_at: Timestamp.now(),
              status: result.outgoing_status,
              rev: increment(1)
            });   
          } else {
            await transaction.set(relationship_doc_ref, {
              id: current_user.id,
              uid: user.id,
              updated_at: Timestamp.now(),
              status: result.outgoing_status,
              rev: 0
            });    
          }
          
          if (other_relationship_doc_snap.exists()) {
            await transaction.update(other_relationship_ref, {
              updated_at: Timestamp.now(),
              status: "none",
              is_blocked: true,
              rev: increment(1)
            });
          } else {
            await transaction.set(other_relationship_ref, {
              id: user.id,
              uid: current_user.id,
              updated_at: Timestamp.now(),
              status: "none",
              is_blocked: true,
              rev: 0
            });
          }
        
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
          await transaction.update(current_user_ref, _.extend({rev: increment(0)}, current_user_update));
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
          await transaction.update(user_ref,  _.extend({rev: increment(0)}, user_update));
        }
      }
      else if (params.action === "unblock") {
        if (relationship && (relationship.status === "block")) {
          const other_relationship_ref = doc(db, "relationship", params.id + $.session.uid);
          result.outgoing_status = "none";
          await transaction.update(relationship_doc_ref, {
            updated_at: Timestamp.now(),
            status: result.outgoing_status,
            rev: increment(1)
          });
          await transaction.updater(other_relationship_ref, {
            updated_at: Timestamp.now(),
            status: "none",
            is_blocked: false,
            rev: increment(1)
          });
          const current_user_update = { updated_at: Timestamp.now() };
          current_user_update.block_count = increment(-1);
          await transaction.update(current_user_ref,  _.extend({rev: increment(0)}, current_user_update));
          const user_update = { updated_at: Timestamp.now() };
          user_update.block_by_count = increment(-1);
          await transaction.update(user_ref,  _.extend({rev: increment(0)}, user_update));
        }
      }
    });
    _.extend(useCachedData.cache_get(params.id), result);
    return result;
  },
  create_post: async function(params) {
    const current_user = $.get_current_user();
    if (!current_user) {
      return;
    }
    const url = params.image.url;
    const now = Timestamp.now();
    const new_id = doc(collection(db, "post")).id;
    const new_post = {
      id: new_id,
      kind: "post",
      uid: $.session.uid,
      active_uid: $.session.uid,
      created_at: now,
      updated_at: now,
      image: params.image,
      emoji: params.emoji,
      image_urls: { "1080": { url: url, width: params.image.width, height: params.image.height } },
      rev: 0
    };

    const new_post_ref = doc(db, "post", new_post.id);
    const current_user_ref = doc(db, "user", current_user.id);
    await runTransaction(db, async (transaction) => {
      const current_user_doc = await transaction.get(current_user_ref);
      const current_user = current_user_doc.data();
      if (current_user.current_post_id) {
        const prev_post_ref = doc(db, "post", current_user.current_post_id);
        await transaction.update(prev_post_ref, {
          active_uid: deleteField(),
          rev: increment(1)
        });

        await transaction.update(current_user_ref, {
          post_count: increment(1),
          current_post_id: new_post.id,
          current_emoji: new_post.emoji,
          rev: increment(1)
        });
      }
      await transaction.set(new_post_ref, new_post);
      await transaction.update(current_user_ref, {
        post_count: increment(1),
        current_post_id: new_post.id,
        current_emoji: new_post.emoji,
        rev: increment(1)
      });
    });

    useCachedData.cache_set(new_post);

    _.extend(current_user, {
      post_count: _.isNumber(current_user.post_count) ? ++current_user.post_count : 1,
      current_post_id: new_post.id,
      current_emoji: new_post.emoji
    });

    const history_cache_data = useCachedData.cache_data_get("HistoryScreen");
    if (history_cache_data) {
      useCachedData.unshift_entity_already_in_cache(new_post.id, history_cache_data);
    }

    return new_post;
  },
  delete_post: async function(params) {
    const current_user = $.get_current_user();
    if (!current_user || !params.post) {
      return;
    }
    const post_ref = doc(db, "post", params.post.id);
    const current_user_ref = doc(db, "user", $.session.uid);

    const user_update = {
      post_count: increment(-1)
    };

    await runTransaction(db, async (transaction) => {
      const current_user_doc = await transaction.get(current_user_ref);
      const db_current_user = current_user_doc.data();
      if (db_current_user.current_post_id === params.post.id) {
        user_update.current_post_id = deleteField();
        user_update.current_emoji = deleteField();
      }

      await transaction.delete(post_ref);
      await transaction.update(current_user_ref, _.extend({rev: increment(1)}, user_update));
    });

    useCachedData.cache_unset(params.post.id);

    _.isNumber(current_user.post_count) ? --current_user.post_count : current_user.post_count = 0;
    if (current_user.current_post_id === params.post.id) {
      delete current_user.current_post_id;
      delete current_user.current_emoji;
    }

    return;
  },
  create_like: async function(params) {
    const current_user = $.get_current_user();
    if (!current_user) {
      return;
    }
    const parent = params.parent;
    if (!parent || parent.is_liked) {
      return;
    }
    const parent_ref = doc(db, parent.kind === "comment" ? "user/" + $.session.uid + "/reaction" : "post", parent.id);
    const reaction_ref = doc(db, "user/" + $.session.uid + "/reaction", "like-" + parent.id);
    await runTransaction(db, async (transaction) => {
      const reaction_doc_snap = await transaction.get(reaction_ref);
      if (reaction_doc_snap.exists()) {
        const reaction = reaction_doc_snap.data();
        if (!reaction.is_liked) {
          await transaction.update(reaction_ref, { updated_at: Timestamp.now(), is_liked: true, like_count: increment(1), rev: increment(1) });
          await transaction.update(parent_ref, { updated_at: Timestamp.now(), like_count: increment(1), rev: increment(1) });
          parent.is_liked = true;
          _.isNumber(parent.like_count) ? ++parent.like_count : parent.like_count = 1;
        }
      }
      else {
        await transaction.set(reaction_ref, { uid: current_user.id, parent_id: parent.id, parent_kind: parent.kind === "comment" ? "reaction" : "post", is_liked: true, like_count: 1, unlike_count: 0, updated_at: Timestamp.now(), created_at: Timestamp.now(), kind: "like", rev: 0 });
        await transaction.update(parent_ref, { updated_at: Timestamp.now(), like_count: increment(1), rev: increment(1) });
        parent.is_liked = true;
        _.isNumber(parent.like_count) ? ++parent.like_count : parent.like_count = 1;
      }
    });
  },
  delete_like: async function(params) {
    const current_user = $.get_current_user();
    if (!current_user) {
      return;
    }
    const parent = params.parent;
    if (!parent || !parent.is_liked) {
      return;
    }

    const parent_ref = doc(db, parent.kind === "comment" ? "user/" + $.session.uid + "/reaction" : "post", parent.id);
    const reaction_ref = doc(db, "user/" + $.session.uid + "/reaction", "like-" + parent.id);
    await runTransaction(db, async (transaction) => {
      const reaction_doc_snap = await transaction.get(reaction_ref);
      if (reaction_doc_snap.exists()) {
        const reaction = reaction_doc_snap.data();
        if (reaction.is_liked) {
          await transaction.update(reaction_ref, { updated_at: Timestamp.now(), is_liked: false, rev: increment(1) });
          await transaction.update(parent_ref, { updated_at: Timestamp.now(), like_count: increment(-1), rev: increment(1) });
          parent.is_liked = false;
          _.isNumber(parent.like_count) ? --parent.like_count : parent.like_count = 0;
        }
      }
    });
  },
  create_comment: async function(params, cache_set, index) {
    const parent = useCachedData.cache_get(params.parent_id);
    if (!parent) {
      return;
    }
    const now = Timestamp.now();
    const new_id = doc(collection(db, "user/" + $.session.uid + "/reaction")).id;
    const new_reaction = {
      id: new_id,
      parent_id: params.parent_id,
      parent_type: params.parent_type,
      uid: $.session.uid,
      created_at: now,
      updated_at: now,
      kind: "comment",
      text: params.text,
      depth: _.isNumber(parent.depth) ? (parent.depth + 1) : 0,
      rev: 0
    };

    const new_reaction_ref = doc(db, "user/" + $.session.uid + "/reaction", new_reaction.id);
    const parent_ref = doc(db, params.parent_type === "post" ? "post" : "user/" + $.session.uid + "/reaction", params.parent_id);
    
    await runTransaction(db, async (transaction) => {
      await transaction.set(new_reaction_ref, new_reaction);
      await transaction.update(parent_ref, {
        comment_count: increment(1),
        rev: increment(1)
      });
    });

    _.isNumber(parent.comment_count) ? parent.comment_count++ : parent.comment_count = 1;

    cache_set(new_reaction, { is_skip_pending: true, index: index || 0 });

    return new_reaction;
  },
  delete_comment: async function(params) {
    const reaction_ref = doc(db, "user/" + $.session.uid + "/reaction", params.comment.id);
    const post_ref = doc(db, "post", params.parent_id);
    await runTransaction(db, async (transaction) => {
      await transaction.delete(reaction_ref);
      await transaction.update(post_ref, {
        comment_count: increment(-1),
        rev: increment(1)
      });
    });
    useCachedData.cache_unset(params.comment.id);
  },
};

export default firestore;
