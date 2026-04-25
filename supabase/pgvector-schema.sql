-- 1. Enable pgvector extension
create extension if not exists vector
with
  schema extensions;

-- 2. Create the knowledge chunks table
create table public.knowledge_chunks (
  id uuid primary key default gen_random_uuid(),
  source text not null,        -- Source filename (e.g., theory.pdf)
  text_content text not null,  -- The actual chunk content
  embedding vector(768),       -- Gemini embedding size is 768
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Note: In a production App, you might want to add Row Level Security (RLS)
-- so users can only read from this table. For this educational app, where the content is global,
-- we'll just enable read access to authenticated users or anon.
alter table public.knowledge_chunks enable row level security;

create policy "Allow read access to all users"
  on public.knowledge_chunks
  for select
  using (true);

-- 3. Create a Supabase function (RPC) for calculating similarity
create or replace function match_knowledge_chunks (
  query_embedding vector(768),
  match_threshold float,
  match_count int
)
returns table (
  id uuid,
  source text,
  text_content text,
  similarity float
)
language sql stable
as $$
  select
    id,
    source,
    text_content,
    1 - (embedding <=> query_embedding) as similarity
  from public.knowledge_chunks
  where 1 - (embedding <=> query_embedding) > match_threshold
  order by similarity desc
  limit match_count;
$$;
