create policy "Authenticated users can insert project suggestions"
on "public"."project_suggestions"
as permissive
for insert
to authenticated
with check (true);


create policy "Everyone can view project suggestions"
on "public"."project_suggestions"
as permissive
for select
to public
using (true);



