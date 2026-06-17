import pytest
import json


class TestAPI:

    def test_root_route_redirects_to_frontend(self, client):
        response = client.get('/')
        assert response.status_code in (301, 302)
        assert 'static' in response.headers.get('Location', '')
        assert 'index.html' in response.headers.get('Location', '')

    def test_static_index_html_accessible(self, client):
        response = client.get('/static/index.html')
        assert response.status_code == 200
        assert 'text/html' in response.content_type

    def test_health_check(self, client):
        response = client.get('/api/health')
        assert response.status_code == 200
        data = response.get_json()
        assert data['status'] == 'ok'
        assert data['service'] == '对话多轮遗忘诊断'

    def test_import_samples_api(self, client, sample_test_data):
        response = client.post(
            '/api/samples/import',
            json=sample_test_data,
            content_type='application/json'
        )
        assert response.status_code == 200
        data = response.get_json()
        assert data['imported'] == 2
        assert data['batch_id'] is not None

    def test_list_batches_api(self, client, sample_test_data):
        client.post('/api/samples/import', json=sample_test_data)
        response = client.get('/api/batches')
        assert response.status_code == 200
        data = response.get_json()
        assert len(data) >= 1

    def test_get_batch_api(self, client, sample_test_data):
        import_resp = client.post('/api/samples/import', json=sample_test_data)
        batch_id = import_resp.get_json()['batch_id']

        response = client.get(f'/api/batches/{batch_id}')
        assert response.status_code == 200
        data = response.get_json()
        assert data['batch_id'] == batch_id
        assert data['total_count'] == 2

    def test_list_samples_api(self, client, sample_test_data):
        client.post('/api/samples/import', json=sample_test_data)
        response = client.get('/api/samples?per_page=10')
        assert response.status_code == 200
        data = response.get_json()
        assert data['total'] == 2
        assert len(data['items']) == 2

    def test_list_samples_filter_by_status_pending(self, client, sample_test_data):
        client.post('/api/samples/import', json=sample_test_data)
        response = client.get('/api/samples?status=PENDING')
        assert response.status_code == 200
        data = response.get_json()
        assert data['total'] == 2
        for item in data['items']:
            assert item['status'] == 'PENDING'

    def test_list_samples_filter_by_status_invalid_returns_all(self, client, sample_test_data):
        client.post('/api/samples/import', json=sample_test_data)
        response = client.get('/api/samples?status=INVALID_STATUS')
        assert response.status_code == 200
        data = response.get_json()
        assert data['total'] == 2

    def test_get_sample_api(self, client, sample_test_data):
        import_resp = client.post('/api/samples/import', json=sample_test_data)
        batch_id = import_resp.get_json()['batch_id']

        list_resp = client.get('/api/samples')
        sample_id = list_resp.get_json()['items'][0]['id']

        response = client.get(f'/api/samples/{sample_id}')
        assert response.status_code == 200
        data = response.get_json()
        assert data['id'] == sample_id
        assert data['batch_id'] == batch_id

    def test_diagnose_sample_api(self, client, sample_test_data):
        client.post('/api/samples/import', json=sample_test_data)
        list_resp = client.get('/api/samples')
        sample_id = list_resp.get_json()['items'][0]['id']

        response = client.post(f'/api/diagnosis/samples/{sample_id}')
        assert response.status_code == 200
        data = response.get_json()
        assert data['sample_id'] == sample_id
        assert data['is_latest'] == True
        assert 'status' in data

    def test_diagnose_batch_api(self, client, sample_test_data):
        import_resp = client.post('/api/samples/import', json=sample_test_data)
        batch_id = import_resp.get_json()['batch_id']

        response = client.post(f'/api/diagnosis/batches/{batch_id}')
        assert response.status_code == 200
        data = response.get_json()
        assert data['total'] == 2
        assert data['processed'] == 2

    def test_get_latest_diagnosis_api(self, client, sample_test_data):
        client.post('/api/samples/import', json=sample_test_data)
        list_resp = client.get('/api/samples')
        sample_id = list_resp.get_json()['items'][0]['id']

        client.post(f'/api/diagnosis/samples/{sample_id}')
        response = client.get(f'/api/diagnosis/samples/{sample_id}/latest')
        assert response.status_code == 200
        data = response.get_json()
        assert data['sample_id'] == sample_id

    def test_get_diagnosis_history_api(self, client, sample_test_data):
        client.post('/api/samples/import', json=sample_test_data)
        list_resp = client.get('/api/samples')
        sample_id = list_resp.get_json()['items'][0]['id']

        for i in range(3):
            client.post(f'/api/diagnosis/samples/{sample_id}')

        response = client.get(f'/api/diagnosis/samples/{sample_id}/history')
        assert response.status_code == 200
        data = response.get_json()
        assert len(data) == 3

    def test_check_duplicates_api(self, client, sample_test_data):
        client.post('/api/samples/import', json={
            "batch_name": "dup_api_test_1",
            "samples": sample_test_data['samples']
        })
        client.post('/api/samples/import', json={
            "batch_name": "dup_api_test_2",
            "samples": sample_test_data['samples']
        })

        response = client.get('/api/deduplication/check')
        assert response.status_code == 200
        data = response.get_json()
        assert data['total'] >= 2

    def test_override_diagnosis_api(self, client, sample_test_data):
        client.post('/api/samples/import', json=sample_test_data)
        list_resp = client.get('/api/samples')
        sample_id = list_resp.get_json()['items'][0]['id']

        client.post(f'/api/diagnosis/samples/{sample_id}')

        correction_data = {
            "sample_id": sample_id,
            "new_status": "PASS",
            "reason": "人工审核通过",
            "overridden_by": "pm_user"
        }
        response = client.post(
            '/api/corrections/override-diagnosis',
            json=correction_data
        )
        assert response.status_code == 200
        data = response.get_json()
        assert data['correction_type'] == 'override_diagnosis'
        assert data['corrected_by'] == 'pm_user'

        latest_diag = client.get(f'/api/diagnosis/samples/{sample_id}/latest').get_json()
        assert latest_diag['status'] == 'PASS'

    def test_list_corrections_api(self, client, sample_test_data):
        client.post('/api/samples/import', json=sample_test_data)
        list_resp = client.get('/api/samples')
        sample_id = list_resp.get_json()['items'][0]['id']

        client.post(f'/api/diagnosis/samples/{sample_id}')

        correction_data = {
            "sample_id": sample_id,
            "new_status": "PASS",
            "reason": "测试修正",
            "overridden_by": "test_user"
        }
        client.post('/api/corrections/override-diagnosis', json=correction_data)

        response = client.get('/api/corrections')
        assert response.status_code == 200
        data = response.get_json()
        assert len(data) >= 1

    def test_calculate_metrics_api(self, client, sample_test_data):
        import_resp = client.post('/api/samples/import', json=sample_test_data)
        batch_id = import_resp.get_json()['batch_id']

        response = client.post(f'/api/metrics/batches/{batch_id}')
        assert response.status_code == 200
        data = response.get_json()
        assert len(data) >= 4

    def test_get_metrics_api(self, client, sample_test_data):
        import_resp = client.post('/api/samples/import', json=sample_test_data)
        batch_id = import_resp.get_json()['batch_id']

        client.post(f'/api/metrics/batches/{batch_id}')

        response = client.get(f'/api/metrics/batches/{batch_id}')
        assert response.status_code == 200
        data = response.get_json()
        assert len(data) >= 4

    def test_compare_batches_api(self, client, sample_test_data):
        import_resp_a = client.post('/api/samples/import', json={
            "batch_name": "api_compare_A",
            "samples": sample_test_data['samples']
        })
        import_resp_b = client.post('/api/samples/import', json={
            "batch_name": "api_compare_B",
            "samples": sample_test_data['samples']
        })
        batch_a_id = import_resp_a.get_json()['batch_id']
        batch_b_id = import_resp_b.get_json()['batch_id']

        client.post(f'/api/metrics/batches/{batch_a_id}')
        client.post(f'/api/metrics/batches/{batch_b_id}')

        compare_data = {
            "batch_a_id": batch_a_id,
            "batch_b_id": batch_b_id,
            "metric_name": "sample_status_ratio"
        }
        response = client.post('/api/metrics/compare', json=compare_data)
        assert response.status_code == 200
        data = response.get_json()
        assert len(data) >= 1

    def test_get_comparisons_api(self, client, sample_test_data):
        import_resp_a = client.post('/api/samples/import', json={
            "batch_name": "api_compare_list_A",
            "samples": sample_test_data['samples']
        })
        import_resp_b = client.post('/api/samples/import', json={
            "batch_name": "api_compare_list_B",
            "samples": sample_test_data['samples']
        })
        batch_a_id = import_resp_a.get_json()['batch_id']
        batch_b_id = import_resp_b.get_json()['batch_id']

        client.post(f'/api/metrics/batches/{batch_a_id}')
        client.post(f'/api/metrics/batches/{batch_b_id}')
        client.post('/api/metrics/compare', json={
            "batch_a_id": batch_a_id,
            "batch_b_id": batch_b_id
        })

        response = client.get('/api/metrics/comparisons')
        assert response.status_code == 200
        data = response.get_json()
        assert len(data) >= 1

    def test_list_security_rules_api(self, client):
        response = client.get('/api/security-rules')
        assert response.status_code == 200
        data = response.get_json()
        assert len(data) >= 4
        rule_codes = {r['rule_code'] for r in data}
        assert 'LEAKAGE_001' in rule_codes
        assert 'LEAKAGE_002' in rule_codes
        assert 'LEAKAGE_003' in rule_codes

    def test_create_security_rule_api(self, client):
        rule_data = {
            "rule_code": "TEST_001",
            "rule_name": "测试规则",
            "description": "这是一个测试规则",
            "severity": "low"
        }
        response = client.post('/api/security-rules', json=rule_data)
        assert response.status_code == 201
        data = response.get_json()
        assert data['rule_code'] == 'TEST_001'
        assert data['is_active'] == True

    def test_update_security_rule_api(self, client):
        response = client.get('/api/security-rules')
        rule_id = response.get_json()[0]['id']

        update_data = {"is_active": False}
        response = client.put(f'/api/security-rules/{rule_id}', json=update_data)
        assert response.status_code == 200
        data = response.get_json()
        assert data['is_active'] == False

    def test_get_batch_summary_api(self, client, sample_test_data):
        import_resp = client.post('/api/samples/import', json=sample_test_data)
        batch_id = import_resp.get_json()['batch_id']
        client.post(f'/api/diagnosis/batches/{batch_id}')

        response = client.get(f'/api/summary/batches/{batch_id}')
        assert response.status_code == 200
        data = response.get_json()
        assert data['batch_id'] == batch_id
        assert data['total_samples'] == 2
        assert 'status_counts' in data
        assert 'pass_rate' in data

    def test_missing_security_rules_produces_actionable_error(self, client, sample_test_data):
        rules = client.get('/api/security-rules').get_json()
        for rule in rules:
            if rule['rule_code'].startswith('LEAKAGE_'):
                client.put(f'/api/security-rules/{rule["id"]}', json={"is_active": False})

        client.post('/api/samples/import', json=sample_test_data)
        list_resp = client.get('/api/samples')
        sample_id = list_resp.get_json()['items'][0]['id']

        response = client.post(f'/api/diagnosis/samples/{sample_id}')
        data = response.get_json()

        assert 'details' in data
        details = data['details']
        assert 'error' in details
        error_data = details['error']
        assert 'actionable_steps' in error_data
        assert len(error_data['actionable_steps']) > 0
        assert 'missing_rules' in error_data
        assert len(error_data['missing_rules']) > 0

        for step in error_data['actionable_steps']:
            assert '安全规则' in step or '重新运行' in step or '排查' in step

    def test_export_samples_api(self, client, sample_test_data):
        import_resp = client.post('/api/samples/import', json=sample_test_data)
        batch_id = import_resp.get_json()['batch_id']
        client.post(f'/api/diagnosis/batches/{batch_id}')

        response = client.get(f'/api/export/samples?batch_id={batch_id}&format=csv')
        assert response.status_code == 200
        assert 'text/csv' in response.content_type
        assert 'attachment' in response.headers['Content-Disposition']

    def test_export_report_api(self, client, sample_test_data):
        import_resp = client.post('/api/samples/import', json=sample_test_data)
        batch_id = import_resp.get_json()['batch_id']
        client.post(f'/api/diagnosis/batches/{batch_id}')

        response = client.get(f'/api/export/report/{batch_id}?format=csv')
        assert response.status_code == 200
        assert 'text/csv' in response.content_type

    def test_duplicate_import_conflict_error(self, client, eval_test_data):
        response1 = client.post('/api/evaluation-bank/import', json=eval_test_data)
        batch_id = response1.get_json()['import_batch_id']

        eval_test_data['import_batch_id'] = batch_id
        response2 = client.post('/api/evaluation-bank/import', json=eval_test_data)
        assert response2.status_code == 400

        error_data = response2.get_json()
        assert 'error' in error_data
        assert 'actionable_steps' in error_data['error']
        assert len(error_data['error']['actionable_steps']) > 0
