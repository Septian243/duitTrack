-- Keep tags that are still referenced by transactions.
alter table transaction_tags
  drop constraint if exists transaction_tags_tag_id_fkey;

alter table transaction_tags
  add constraint transaction_tags_tag_id_fkey
  foreign key (tag_id) references tags(id);
