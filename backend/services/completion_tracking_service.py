"""
Completion Tracking Service - Automated Service Completion Detection
Handles tenant confirmation emails and auto-triggering invoice workflow
"""

import uuid
import logging
from datetime import datetime, timedelta
from typing import Optional, Dict, List
from motor.motor_asyncio import AsyncIOMotorDatabase

# Email imports - handle compatibility issues
try:
    import smtplib
    from email.mime.text import MimeText
    from email.mime.multipart import MimeMultipart
    EMAIL_AVAILABLE = True
except ImportError as e:
    logging.warning(f"Email libraries not available: {e}")
    EMAIL_AVAILABLE = False
    # Mock classes for development
    class MimeText:
        def __init__(self, *args, **kwargs): pass
    class MimeMultipart:
        def __init__(self, *args, **kwargs): pass
    class smtplib:
        class SMTP:
            def __init__(self, *args, **kwargs): pass
            def starttls(self): pass
            def login(self, *args, **kwargs): pass
            def send_message(self, *args, **kwargs): pass
            def __enter__(self): return self
            def __exit__(self, *args): pass

from models.service_request import ServiceRequest
from services.contractor_email_service import ContractorEmailService, get_smtp_config
from services.tenant_service import TenantService


logger = logging.getLogger(__name__)


class CompletionTrackingService:
    """Service for tracking service completion and triggering invoice workflow"""
    
    def __init__(self, db: AsyncIOMotorDatabase, contractor_email_service: ContractorEmailService, 
                 smtp_config: Optional[Dict[str, str]] = None):
        self.db = db
        self.contractor_email_service = contractor_email_service
        self.smtp_config = smtp_config or get_smtp_config()
    
    async def send_tenant_confirmation_email(self, service_request: ServiceRequest, 
                                           confirmation_token: str, base_url: str) -> bool:
        """
        Send confirmation email to tenant asking if service was completed.
        
        Args:
            service_request: The service request object
            confirmation_token: Unique token for tenant confirmation
            base_url: Base URL for the application
        
        Returns:
            bool: True if email sent successfully, False otherwise
        """
        try:
            # Get tenant info using TenantService
            tenant_service = TenantService(self.db)
            tenant_account = await tenant_service.get_tenant_by_id(service_request.tenant_id)
            
            # Convert to dict format for backward compatibility
            tenant = None
            if tenant_account:
                tenant = {
                    "first_name": tenant_account.first_name,
                    "last_name": tenant_account.last_name,
                    "email": tenant_account.email
                }
            property_info = await self.db.properties.find_one({"_id": service_request.property_id})
            
            if not tenant or not tenant.get("email"):
                logger.error(f"No tenant email found for service request {service_request.id}")
                return False
            
            tenant_name = f"{tenant.get('first_name', '')} {tenant.get('last_name', '')}"
            property_address = property_info.get("address", "Your property") if property_info else "Your property"
            
            # Confirmation URLs
            confirm_url = f"{base_url}/portal/confirm-completion/{confirmation_token}?completed=true"
            not_completed_url = f"{base_url}/portal/confirm-completion/{confirmation_token}?completed=false"
            
            # Appointment date
            appointment_date = "recently"
            if service_request.appointment_confirmed_datetime:
                appointment_date = service_request.appointment_confirmed_datetime.strftime("%A, %B %d")
            
            # Email content
            subject = f"Service Completion Confirmation - {service_request.title}"
            
            html_body = f"""
            <html>
            <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
                <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
                    <h2 style="color: #2563eb; border-bottom: 2px solid #2563eb; padding-bottom: 10px;">
                        Service Completion Confirmation
                    </h2>
                    
                    <p>Hello {tenant_name},</p>
                    
                    <p>We hope this message finds you well. We wanted to follow up regarding the service request that was scheduled for {appointment_date} at {property_address}.</p>
                    
                    <div style="background-color: #f3f4f6; padding: 15px; border-radius: 8px; margin: 20px 0;">
                        <h3 style="margin-top: 0; color: #1f2937;">Service Details</h3>
                        <p><strong>Service:</strong> {service_request.title}</p>
                        <p><strong>Type:</strong> {service_request.request_type.replace('_', ' ').title()}</p>
                        <p><strong>Description:</strong> {service_request.description}</p>
                        <p><strong>Property:</strong> {property_address}</p>
                    </div>
                    
                    <p><strong>Please let us know: Was the service completed to your satisfaction?</strong></p>
                    
                    <div style="text-align: center; margin: 30px 0;">
                        <table style="margin: 0 auto;">
                            <tr>
                                <td style="padding: 10px;">
                                    <a href="{confirm_url}" 
                                       style="background-color: #059669; color: white; padding: 15px 25px; 
                                              text-decoration: none; border-radius: 8px; font-weight: bold; 
                                              display: inline-block;">
                                        ✅ Yes, Service Completed
                                    </a>
                                </td>
                                <td style="padding: 10px;">
                                    <a href="{not_completed_url}" 
                                       style="background-color: #dc2626; color: white; padding: 15px 25px; 
                                              text-decoration: none; border-radius: 8px; font-weight: bold; 
                                              display: inline-block;">
                                        ❌ No, Still Needs Work
                                    </a>
                                </td>
                            </tr>
                        </table>
                    </div>
                    
                    <div style="background-color: #fef3c7; padding: 15px; border-radius: 8px; margin: 20px 0;">
                        <h3 style="margin-top: 0; color: #92400e;">⏰ Important Timing</h3>
                        <p style="margin-bottom: 0; color: #92400e;">
                            Please respond within 48 hours. If we don't hear from you, we'll assume the service was completed successfully and process payment to the contractor.
                        </p>
                    </div>
                    
                    <div style="border-top: 1px solid #e5e7eb; padding-top: 15px; font-size: 12px; color: #6b7280;">
                        <p><strong>What happens next?</strong></p>
                        <ul>
                            <li><strong>If completed:</strong> We'll process the contractor's invoice and close the service request</li>
                            <li><strong>If not completed:</strong> We'll contact the contractor to schedule additional work</li>
                            <li><strong>No response:</strong> After 48 hours, we'll assume completion and process payment</li>
                        </ul>
                        
                        <p style="margin-top: 15px;">
                            <em>Questions? Contact our property management team at your convenience.</em>
                        </p>
                        
                        <p style="margin-top: 10px; font-size: 10px; color: #9ca3af;">
                            This confirmation link expires in 7 days.
                        </p>
                    </div>
                </div>
            </body>
            </html>
            """
            
            # Send email
            return await self._send_email(tenant["email"], subject, html_body)
            
        except Exception as e:
            logger.error(f"Error sending tenant confirmation email: {e}")
            return False
    
    async def process_tenant_confirmation(self, confirmation_token: str, completed: bool, 
                                        tenant_feedback: Optional[str] = None) -> bool:
        """
        Process tenant's confirmation response and trigger appropriate workflow.
        
        Args:
            confirmation_token: The confirmation token from the email
            completed: True if tenant confirms completion, False if still needs work
            tenant_feedback: Optional feedback from tenant
        
        Returns:
            bool: True if processed successfully, False otherwise
        """
        try:
            # Find service request by confirmation token
            service_request = await self.db.service_requests.find_one({
                "tenant_confirmation_token": confirmation_token
            })
            
            if not service_request:
                logger.error(f"Service request not found for confirmation token: {confirmation_token}")
                return False
            
            current_time = datetime.utcnow()
            
            if completed:
                # Tenant confirms completion - trigger invoice workflow
                await self.db.service_requests.update_one(
                    {"_id": service_request["_id"]},
                    {
                        "$set": {
                            "completion_status": "tenant_confirmed",
                            "tenant_confirmed_at": current_time,
                            "tenant_feedback": tenant_feedback,
                            "updated_at": current_time
                        }
                    }
                )
                
                # Trigger invoice email (Link 2)
                await self._trigger_invoice_workflow(service_request)
                
                logger.info(f"Service request {service_request['_id']} confirmed complete by tenant")
                return True
                
            else:
                # Tenant says work not completed - notify property management
                await self.db.service_requests.update_one(
                    {"_id": service_request["_id"]},
                    {
                        "$set": {
                            "completion_status": "tenant_disputed",
                            "tenant_confirmed_at": current_time,
                            "tenant_feedback": tenant_feedback,
                            "status": "in_progress",  # Reset status for additional work
                            "updated_at": current_time
                        }
                    }
                )
                
                # Send notification to property management
                await self._notify_property_management_of_dispute(service_request, tenant_feedback)
                
                logger.info(f"Service request {service_request['_id']} disputed by tenant")
                return True
                
        except Exception as e:
            logger.error(f"Error processing tenant confirmation: {e}")
            return False
    
    async def auto_confirm_completion(self, service_request_id: str) -> bool:
        """
        Auto-confirm service completion after 48 hours with no tenant response.
        
        Args:
            service_request_id: The service request ID to auto-confirm
        
        Returns:
            bool: True if auto-confirmed successfully, False otherwise
        """
        try:
            service_request = await self.db.service_requests.find_one({"_id": service_request_id})
            
            if not service_request:
                logger.error(f"Service request not found for auto-confirmation: {service_request_id}")
                return False
            
            # Check if already confirmed or disputed
            if service_request.get("completion_status") in ["tenant_confirmed", "tenant_disputed"]:
                logger.info(f"Service request {service_request_id} already has tenant response")
                return True
            
            current_time = datetime.utcnow()
            
            # Auto-confirm completion
            await self.db.service_requests.update_one(
                {"_id": service_request_id},
                {
                    "$set": {
                        "completion_status": "auto_confirmed",
                        "auto_confirmed_at": current_time,
                        "updated_at": current_time
                    }
                }
            )
            
            # Trigger invoice workflow (Link 2)
            await self._trigger_invoice_workflow(service_request)
            
            logger.info(f"Service request {service_request_id} auto-confirmed after tenant timeout")
            return True
            
        except Exception as e:
            logger.error(f"Error auto-confirming completion: {e}")
            return False
    
    async def _trigger_invoice_workflow(self, service_request: Dict) -> bool:
        """
        Trigger the invoice workflow by sending Link 2 email to contractor.
        
        Args:
            service_request: The service request document
        
        Returns:
            bool: True if triggered successfully, False otherwise
        """
        try:
            # Check if invoice email already sent
            if service_request.get("invoice_link_sent"):
                logger.info(f"Invoice link already sent for service request {service_request['_id']}")
                return True
            
            # Generate invoice token if not exists
            invoice_token = service_request.get("invoice_upload_token")
            if not invoice_token:
                invoice_token = self.contractor_email_service.generate_invoice_token()
                await self.db.service_requests.update_one(
                    {"_id": service_request["_id"]},
                    {"$set": {"invoice_upload_token": invoice_token}}
                )
            
            # Get contractor email
            contractor_email = service_request.get("contractor_email")
            if not contractor_email:
                logger.error(f"No contractor email for service request {service_request['_id']}")
                return False
            
            # Send Link 2 email
            base_url = "http://localhost:3000"  # TODO: Get from config
            
            # Convert dict to ServiceRequest object for email service
            sr_obj = ServiceRequest(**service_request)
            
            success = await self.contractor_email_service.send_invoice_email(
                sr_obj, contractor_email, invoice_token, base_url
            )
            
            if success:
                # Mark invoice link as sent
                await self.db.service_requests.update_one(
                    {"_id": service_request["_id"]},
                    {
                        "$set": {
                            "invoice_link_sent": True,
                            "invoice_link_sent_at": datetime.utcnow(),
                            "updated_at": datetime.utcnow()
                        }
                    }
                )
                
                logger.info(f"Invoice workflow triggered for service request {service_request['_id']}")
                
            return success
            
        except Exception as e:
            logger.error(f"Error triggering invoice workflow: {e}")
            return False
    
    async def _notify_property_management_of_dispute(self, service_request: Dict, 
                                                   tenant_feedback: Optional[str] = None) -> bool:
        """
        Notify property management when tenant disputes service completion.
        
        Args:
            service_request: The service request document
            tenant_feedback: Optional feedback from tenant
        
        Returns:
            bool: True if notification sent successfully, False otherwise
        """
        try:
            # Get property manager email (placeholder - implement based on your system)
            property_manager_email = "property.manager@example.com"  # TODO: Get from config
            
            # Get tenant and property info using TenantService
            tenant_service = TenantService(self.db)
            tenant_account = await tenant_service.get_tenant_by_id(service_request["tenant_id"])
            property_info = await self.db.properties.find_one({"_id": service_request["property_id"]})
            
            tenant_name = f"{tenant_account.first_name} {tenant_account.last_name}" if tenant_account else "Tenant"
            property_address = property_info.get("address", "Property") if property_info else "Property"
            
            subject = f"🚨 Service Completion Disputed - {service_request['title']}"
            
            html_body = f"""
            <html>
            <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
                <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
                    <h2 style="color: #dc2626; border-bottom: 2px solid #dc2626; padding-bottom: 10px;">
                        🚨 Service Completion Disputed
                    </h2>
                    
                    <div style="background-color: #fef2f2; border border-red-200 rounded-lg p-4 mb-4">
                        <p style="margin: 0; color: #dc2626; font-medium;">
                            Tenant has reported that the service was NOT completed satisfactorily.
                        </p>
                    </div>
                    
                    <div style="background-color: #f3f4f6; padding: 15px; border-radius: 8px; margin: 20px 0;">
                        <h3 style="margin-top: 0; color: #1f2937;">Service Request Details</h3>
                        <p><strong>ID:</strong> {service_request['_id']}</p>
                        <p><strong>Service:</strong> {service_request['title']}</p>
                        <p><strong>Type:</strong> {service_request['request_type']}</p>
                        <p><strong>Tenant:</strong> {tenant_name}</p>
                        <p><strong>Property:</strong> {property_address}</p>
                        <p><strong>Contractor:</strong> {service_request.get('contractor_email', 'Unknown')}</p>
                    </div>
                    
                    {f'''
                    <div style="background-color: #fef3c7; padding: 15px; border-radius: 8px; margin: 20px 0;">
                        <h3 style="margin-top: 0; color: #92400e;">Tenant Feedback</h3>
                        <p style="margin-bottom: 0; color: #92400e;">{tenant_feedback}</p>
                    </div>
                    ''' if tenant_feedback else ''}
                    
                    <div style="background-color: #ecfdf5; padding: 15px; border-radius: 8px; margin: 20px 0;">
                        <h3 style="margin-top: 0; color: #065f46;">Required Actions</h3>
                        <ul style="margin-bottom: 0; color: #065f46;">
                            <li>Contact the contractor to discuss the issue</li>
                            <li>Schedule additional work if needed</li>
                            <li>Follow up with the tenant once resolved</li>
                            <li>Update the service request status in the system</li>
                        </ul>
                    </div>
                    
                    <p style="color: #6b7280; font-size: 12px; margin-top: 20px;">
                        <em>This notification was generated automatically by the completion tracking system.</em>
                    </p>
                </div>
            </body>
            </html>
            """
            
            return await self._send_email(property_manager_email, subject, html_body)
            
        except Exception as e:
            logger.error(f"Error notifying property management of dispute: {e}")
            return False
    
    async def _send_email(self, to_email: str, subject: str, html_body: str) -> bool:
        """
        Internal method to send email using SMTP configuration.
        
        Args:
            to_email: Recipient email address
            subject: Email subject
            html_body: HTML email body
        
        Returns:
            bool: True if sent successfully, False otherwise
        """
        try:
            if not EMAIL_AVAILABLE:
                # Mock email sending in development
                logger.info(f"📧 MOCK EMAIL to {to_email}: {subject}")
                print(f"📧 MOCK EMAIL SENT:")
                print(f"   To: {to_email}")
                print(f"   Subject: {subject}")
                print(f"   Content: {html_body[:200]}...")
                return True
            
            # Create message
            msg = MimeMultipart('alternative')
            msg['Subject'] = subject
            msg['From'] = self.smtp_config['from_email']
            msg['To'] = to_email
            
            # Add HTML content
            html_part = MimeText(html_body, 'html')
            msg.attach(html_part)
            
            # Send email
            with smtplib.SMTP(self.smtp_config['smtp_server'], self.smtp_config['smtp_port']) as server:
                if self.smtp_config.get('use_tls', True):
                    server.starttls()
                
                if self.smtp_config.get('username') and self.smtp_config.get('password'):
                    server.login(self.smtp_config['username'], self.smtp_config['password'])
                
                server.send_message(msg)
            
            logger.info(f"Email sent successfully to {to_email}")
            return True
            
        except Exception as e:
            logger.error(f"Failed to send email to {to_email}: {e}")
            return False


# Scheduled task functions for background processing
async def schedule_completion_confirmations(db: AsyncIOMotorDatabase, 
                                          completion_service: CompletionTrackingService):
    """
    Scheduled task to send completion confirmation emails for recently completed services.
    Should be run periodically (e.g., every hour) to check for services that need confirmation.
    """
    try:
        # Find service requests that were completed recently but haven't had confirmation emails sent
        two_days_ago = datetime.utcnow() - timedelta(days=2)
        
        # Query for requests that:
        # 1. Are marked as completed 
        # 2. Don't have a confirmation email sent yet
        # 3. Were completed within the last 2 days
        service_requests = await db.service_requests.find({
            "status": "completed",
            "completion_status": "pending",
            "completed_at": {"$gte": two_days_ago},
            "tenant_confirmation_email_sent": {"$ne": True}
        }).to_list(None)
        
        base_url = "http://localhost:3000"  # TODO: Get from config
        
        for sr in service_requests:
            # Generate confirmation token
            confirmation_token = f"confirm_{uuid.uuid4().hex[:16]}"
            
            # Send confirmation email
            sr_obj = ServiceRequest(**sr)
            success = await completion_service.send_tenant_confirmation_email(
                sr_obj, confirmation_token, base_url
            )
            
            if success:
                # Mark email as sent and store token
                await db.service_requests.update_one(
                    {"_id": sr["_id"]},
                    {
                        "$set": {
                            "tenant_confirmation_email_sent": True,
                            "tenant_confirmation_token": confirmation_token,
                            "confirmation_email_sent_at": datetime.utcnow(),
                            "updated_at": datetime.utcnow()
                        }
                    }
                )
                
                logger.info(f"Confirmation email sent for service request {sr['_id']}")
        
        logger.info(f"Processed {len(service_requests)} service requests for completion confirmation")
        
    except Exception as e:
        logger.error(f"Error in schedule_completion_confirmations: {e}")


async def schedule_auto_confirmations(db: AsyncIOMotorDatabase, 
                                    completion_service: CompletionTrackingService):
    """
    Scheduled task to auto-confirm services after 48 hours with no tenant response.
    Should be run periodically (e.g., every few hours) to check for timeouts.
    """
    try:
        # Find service requests where:
        # 1. Confirmation email was sent more than 48 hours ago
        # 2. Tenant hasn't responded yet
        # 3. Not already auto-confirmed
        
        forty_eight_hours_ago = datetime.utcnow() - timedelta(hours=48)
        
        service_requests = await db.service_requests.find({
            "tenant_confirmation_email_sent": True,
            "confirmation_email_sent_at": {"$lte": forty_eight_hours_ago},
            "completion_status": "pending"
        }).to_list(None)
        
        for sr in service_requests:
            success = await completion_service.auto_confirm_completion(sr["_id"])
            if success:
                logger.info(f"Auto-confirmed service request {sr['_id']} after tenant timeout")
        
        logger.info(f"Processed {len(service_requests)} service requests for auto-confirmation")
        
    except Exception as e:
        logger.error(f"Error in schedule_auto_confirmations: {e}")